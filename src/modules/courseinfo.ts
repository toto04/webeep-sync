import path from "path"
import fs from "fs/promises"
import got from "got"
import { createLogger } from "./logger"
import { loginManager } from "./login"
import { Contents, Course, FileInfo, moodleClient } from "./moodle"
import { store } from "./store"
import { sanitizePath } from "../util"

const { log, error, debug } = createLogger("CourseInfo")

/** folder created inside each course folder, holds everything that is not a plain file */
const INFO_FOLDER = "_WeBeep Info"

type Attachment = {
  filename: string
  /** course files and assignments use fileurl, forum posts use url instead */
  fileurl?: string
  url?: string
  filesize: number
  timemodified: number
}

type Module = Contents[number]["modules"][number] & {
  description?: string
  dates?: { label: string; timestamp: number }[]
}

const HTML_ENTITIES: { [entity: string]: string } = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: String.fromCharCode(34), // eslint wants "\"" but prettier rewrites it as '"'
  apos: "'",
}

/**
 * Some teachers write texts in both languages, as {mlang it}...{mlang}{mlang en}...{mlang}.
 * The web service doesn't always resolve those tags, so keep the english version
 */
function multilang(text: string): string {
  if (!text.includes("{mlang")) return text
  const en = text.match(/\{mlang en\}([\s\S]*?)\{mlang\}/i)
  return en ? en[1] : text.replace(/\{mlang[^}]*\}/gi, "")
}

/**
 * Converts the html coming from moodle (announcements, labels, pages...) to markdown.
 * It doesn't need to be perfect, just readable, so no extra dependency for this
 */
function htmlToMarkdown(html?: string): string {
  if (!html) return ""
  let s = multilang(html).replace(/\r/g, "")
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
  s = s.replace(/<br\s*\/?>/gi, "\n")
  s = s.replace(
    /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_, n, text) => `\n\n${"#".repeat(Math.min(6, Number(n) + 2))} ${text}\n\n`,
  )
  s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
  s = s.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, "_$2_")
  s = s.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
  s = s.replace(
    /<a\b[^>]*?href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, text) => {
      const t = text.replace(/<[^>]+>/g, "").trim()
      // not <href>, the tag stripping below would remove it
      return `[${t || href}](${href})`
    },
  )
  s = s.replace(/<li\b[^>]*>/gi, "\n- ")
  s = s.replace(/<\/(p|div|ul|ol|table|tr|blockquote|pre)>/gi, "\n\n")
  s = s.replace(/<(td|th)\b[^>]*>/gi, " | ")
  s = s.replace(/<[^>]+>/g, "") // drop every other tag
  s = s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (entity, code: string) => {
    if (code[0] !== "#") return HTML_ENTITIES[code] ?? entity
    return String.fromCodePoint(
      code[1].toLowerCase() === "x"
        ? parseInt(code.slice(2), 16)
        : Number(code.slice(1)),
    )
  })
  return s
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** formats a moodle timestamp (seconds) as YYYY-MM-DD HH:MM */
function formatDate(ts?: number): string {
  if (!ts) return "-"
  const d = new Date(ts * 1000)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`
}

/** indents every line of a block, used to nest descriptions under list items */
function indent(text: string): string {
  return text
    .split("\n")
    .map(l => (l ? "  " + l : ""))
    .join("\n")
}

/**
 * writes the file only if the content actually changed, this way the last modified date of the
 * markdown files means something
 */
async function writeIfChanged(file: string, content: string): Promise<boolean> {
  try {
    if ((await fs.readFile(file, "utf8")) === content) return false
  } catch (e) {
    /* the file doesn't exist yet */
  }
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, content, "utf8")
  return true
}

/**
 * same as {@link moodleClient.call}, but returns undefined instead of throwing or returning the
 * moodle exception, as a missing piece of information should never stop the sync
 */
async function tryCall(
  wsfunction: string,
  data: { [key: string]: unknown },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  try {
    const res = await moodleClient.call(wsfunction, data, false)
    if (res?.exception) {
      debug(`${wsfunction} failed: ${res.errorcode}`)
      return undefined
    }
    return res
  } catch (e) {
    debug(`${wsfunction} failed: ${e}`)
    return undefined
  }
}

class CourseInfoExporter {
  /** attachments found while exporting, they are downloaded like any other file */
  attachments: FileInfo[] = []
  private base: string
  private updated: string[] = []

  constructor(private course: Course) {
    this.base = path.join(
      store.data.settings.downloadPath,
      sanitizePath(course.name),
      INFO_FOLDER,
    )
  }

  private async write(name: string, content: string) {
    const file = path.join(this.base, sanitizePath(name))
    if (await writeIfChanged(file, content)) this.updated.push(name)
  }

  /** adds an attachment to the download list and returns the relative link to it */
  private addAttachment(folder: string, a: Attachment): string {
    let fileurl = a.fileurl ?? a.url
    if (!fileurl) return ""
    // files can only be downloaded with the token through the webservice endpoint
    if (!fileurl.includes("/webservice/pluginfile.php"))
      fileurl = fileurl.replace("/pluginfile.php", "/webservice/pluginfile.php")

    const filename = sanitizePath(a.filename.replace(/[/\\]/g, "_"))
    this.attachments.push({
      coursename: this.course.name,
      filename,
      filepath: sanitizePath(path.join(this.course.name, INFO_FOLDER, folder)),
      filesize: a.filesize ?? 0,
      fileurl,
      timecreated: a.timemodified,
      timemodified: a.timemodified,
    })
    return encodeURI(path.join(folder, filename).replace(/\\/g, "/"))
  }

  /** adds every attachment to the download list, returns the markdown links to them */
  private attachmentLinks(folder: string, attachments?: Attachment[]): string {
    let md = ""
    for (const a of attachments ?? []) {
      const link = this.addAttachment(folder, a)
      if (link) md += `\nAttachment: [${a.filename}](${link})\n`
    }
    return md
  }

  async run() {
    const {
      syncCourseOverview,
      syncAnnouncements,
      syncForums,
      syncAssignments,
      syncGrades,
    } = store.data.settings
    if (syncCourseOverview) await this.overview()
    if (syncAnnouncements || syncForums)
      await this.forums(syncAnnouncements, syncForums)
    if (syncAssignments) await this.assignments()
    if (syncGrades) await this.grades()
    if (this.updated.length)
      log(`${this.course.name}: updated ${this.updated.join(", ")}`)
  }

  /** every section with its summary and modules, labels included, plus the content of pages */
  private async overview() {
    const contents: (Contents[number] & { summary?: string })[] = await tryCall(
      "core_course_get_contents",
      { courseid: this.course.id },
    )
    if (!Array.isArray(contents)) return

    let md = `# ${this.course.fullname}\n`
    for (const section of contents) {
      md += `\n## ${multilang(section.name)}\n`
      const summary = htmlToMarkdown(section.summary)
      if (summary) md += `\n${summary}\n`

      for (const mod of section.modules as Module[]) {
        const desc = htmlToMarkdown(mod.description)
        // labels are just text shown in the course page
        if (mod.modname === "label") {
          if (desc) md += `\n${desc}\n`
          continue
        }

        md += `\n- **${multilang(mod.name)}** _(${mod.modname})_`
        if (mod.modname === "url") {
          const url = mod.contents?.find(c => c.type === "url")?.fileurl
          if (url) md += ` <${url}>`
        }
        if (mod.dates?.length)
          md +=
            " - " +
            mod.dates
              .map(d => `${d.label} ${formatDate(d.timestamp)}`)
              .join(", ")
        md += "\n"
        if (desc) md += indent(desc) + "\n"

        if (mod.modname === "page") await this.page(mod)
      }
    }
    await this.write("Course overview.md", md)
  }

  /** the content of a page is an index.html file, saved converted to markdown */
  private async page(mod: Module) {
    const index = mod.contents?.find(c => c.filename === "index.html")
    if (!index) return
    try {
      const html = await got(index.fileurl, {
        searchParams: { token: loginManager.token },
      }).text()
      await this.write(
        path.join("Pages", `${mod.name}.md`),
        `# ${mod.name}\n\n${htmlToMarkdown(html)}\n`,
      )
    } catch (e) {
      debug(`cannot download page ${mod.name}: ${e}`)
    }
  }

  /** one markdown file for each forum, every discussion with all of its posts */
  private async forums(announcements: boolean, others: boolean) {
    const forums: { id: number; name: string; type: string; intro?: string }[] =
      (await tryCall("mod_forum_get_forums_by_courses", {
        "courseids[0]": this.course.id,
      })) ?? []

    for (const forum of forums) {
      const isNews = forum.type === "news" // the "Avvisi" forum
      if (isNews ? !announcements : !others) continue

      const res = await tryCall("mod_forum_get_forum_discussions", {
        forumid: forum.id,
        page: 0,
        perpage: 200,
      })
      const discussions: {
        discussion: number
        name: string
        created: number
        userfullname: string
      }[] = res?.discussions ?? []
      if (!discussions.length) continue // no point in saving an empty forum
      discussions.sort((a, b) => b.created - a.created) // newest first

      const folder = path.join(
        "Attachments",
        isNews ? "Announcements" : forum.name,
      )
      let md = `# ${forum.name}\n`
      const intro = htmlToMarkdown(forum.intro)
      if (intro) md += `\n${intro}\n`

      for (const d of discussions) {
        const res = await tryCall("mod_forum_get_discussion_posts", {
          discussionid: d.discussion,
          sortby: "created",
          sortdirection: "ASC",
        })
        const posts: {
          message: string
          timecreated: number
          author?: { fullname?: string }
          attachments?: Attachment[]
        }[] = res?.posts ?? []

        md += `\n---\n\n## ${d.name}\n\n_${d.userfullname}, ${formatDate(d.created)}_\n`
        for (let i = 0; i < posts.length; i++) {
          const post = posts[i]
          // the first post is the discussion itself, the others are replies
          if (i > 0)
            md += `\n### Reply from ${post.author?.fullname ?? "?"}, ${formatDate(
              post.timecreated,
            )}\n`
          md += `\n${htmlToMarkdown(post.message)}\n`
          md += this.attachmentLinks(folder, post.attachments)
        }
      }
      await this.write(
        isNews ? "Announcements.md" : `Forum - ${forum.name}.md`,
        md,
      )
    }
  }

  /** assignments with their dates and the upcoming events of the course calendar */
  private async assignments() {
    const res = await tryCall("mod_assign_get_assignments", {
      "courseids[0]": this.course.id,
    })
    const assignments: {
      name: string
      duedate: number
      cutoffdate: number
      allowsubmissionsfromdate: number
      intro?: string
      introattachments?: Attachment[]
    }[] = res?.courses?.[0]?.assignments ?? []

    let md = "# Assignments and deadlines\n"
    for (const a of assignments) {
      md += `\n## ${a.name}\n\n`
      md += `- Opens: ${formatDate(a.allowsubmissionsfromdate)}\n`
      md += `- **Due: ${formatDate(a.duedate)}**\n`
      md += `- Cut-off: ${formatDate(a.cutoffdate)}\n`
      const intro = htmlToMarkdown(a.intro)
      if (intro) md += `\n${intro}\n`
      const folder = path.join("Attachments", "Assignments", a.name)
      md += this.attachmentLinks(folder, a.introattachments)
    }

    const upcoming = await tryCall("core_calendar_get_calendar_upcoming_view", {
      courseid: this.course.id,
    })
    const events: { name: string; timestart: number; description?: string }[] =
      upcoming?.events ?? []
    if (!assignments.length && !events.length) return

    md += "\n## Upcoming events\n"
    if (!events.length) md += "\nNone.\n"
    for (const e of events) {
      md += `\n- **${formatDate(e.timestart)}** ${e.name}\n`
      const desc = htmlToMarkdown(e.description)
      if (desc) md += indent(desc) + "\n"
    }
    await this.write("Assignments and deadlines.md", md)
  }

  /** the user's grade report for this course */
  private async grades() {
    if (!moodleClient.userid) return
    const res = await tryCall("gradereport_user_get_grade_items", {
      courseid: this.course.id,
      userid: moodleClient.userid,
    })
    const items: {
      itemname?: string
      gradeformatted?: string
      percentageformatted?: string
      feedback?: string
    }[] = res?.usergrades?.[0]?.gradeitems ?? []
    // the course total is always there, save the file only once something is graded
    const graded = (g: (typeof items)[number]) =>
      g.gradeformatted && g.gradeformatted !== "-"
    if (!items.some(g => g.itemname && graded(g))) return

    let md = "# Grades\n\n| Item | Grade | Percentage |\n|---|---|---|\n"
    for (const g of items) {
      const name = g.itemname ? multilang(g.itemname) : "Course total"
      md += `| ${name} | ${graded(g) ? g.gradeformatted : "-"} | ${
        g.percentageformatted || "-"
      } |\n`
    }
    for (const g of items) {
      const feedback = htmlToMarkdown(g.feedback)
      if (feedback)
        md += `\n## Feedback for ${multilang(g.itemname ?? "the course")}\n\n${feedback}\n`
    }
    await this.write("Grades.md", md)
  }
}

/**
 * Saves the course information selected in the settings (announcements, forums, overview,
 * assignments, grades) as markdown files in the {@link INFO_FOLDER} of the course.
 * Never throws: a failure here should not prevent the files from being synced.
 * @returns the attachments to be downloaded together with the course files
 */
export async function syncCourseInfo(course: Course): Promise<FileInfo[]> {
  const exporter = new CourseInfoExporter(course)
  try {
    await exporter.run()
  } catch (e) {
    error(`Could not save the course info of ${course.name}:`)
    error(e)
  }
  return exporter.attachments
}
