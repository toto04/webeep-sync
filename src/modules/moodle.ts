import path from "path"
import { EventEmitter } from "events"
import got from "got"
import { createLogger } from "./logger"
import { loginManager } from "./login"
import { storeIsReady, store } from "./store"
import { generateUID, sanitizePath } from "../util"

const { log, debug } = createLogger("MoodleClient")

/** module name to be excluded from file search to prevent download of junk */
export const EXCLUDED_MODNAMES = [
  "page",
  "forum",
  "url",
  "wooclap",
  "choice",
  "feedback",
  "label",
  "lesson",
]

export interface Course {
  id: number
  fullname: string
  name: string
  shouldSync: boolean
}

export interface FileInfo {
  coursename: string
  filename: string
  filepath: string
  filesize: number
  fileurl: string
  timecreated: number
  timemodified: number
  updating?: boolean // set to true if the file is already downloaded, and is being updated
}

export type Contents = {
  id: number
  name: string
  modules: {
    id: number
    name: string
    modname: string
    contents?: ({
      type: string
    } & FileInfo)[]
  }[]
}[]

export type MoodleNotification = {
  id: number
  title: string
  htmlbody: string
  timecreated: number
  read: boolean
  url: string
  courseid?: string
}

function getDefaultName(fullname: string) {
  const m = fullname.match(/\d+ - (.+) \(.+\)/)
  return m ? m[1] : fullname
}

export declare interface MoodleClient {
  on(event: "disconnected", listener: () => void): this
  on(event: "reconnected", listener: () => void): this
  on(event: "network_event", listener: (connected: boolean) => void): this
  on(event: "username", listener: (username: string) => void): this
  on(event: "courses", listener: (courses: Course[]) => void): this
  on(
    event: "notifications",
    listener: (notifications: MoodleNotification[]) => void,
  ): this
}
export class MoodleClient extends EventEmitter {
  userid?: number
  username?: string
  connected = true

  waitingForCourses = false
  cachedCourses: Course[] = []
  cachedNotifications: MoodleNotification[] = []

  constructor() {
    super()
    loginManager.once("ready", () => {
      if (loginManager.isLogged)
        this.getUserID().then(() => {
          // update the notification cache every 2 minutes
          this.getNotifications()
          setInterval(
            () => {
              this.getNotifications()
            },
            1000 * 60 * 2,
          )
        })
    })
  }

  /**
   * Sets the {@link connected} parameter to the correct value, and emits the correct events
   * @param conn true when connected, false when disconnected
   */
  private setConnected(conn: boolean) {
    if (this.connected !== conn) {
      this.connected = conn
      log(conn ? "reconneted!" : "disconnected!")
      this.emit("network_event", conn)
      this.emit(conn ? "reconnected" : "disconnected")
    }
  }

  /**
   * This function handles calls to the Moodle Web API
   */
  async call(
    /**
     * the moodle function [Moodle API Docs](https://docs.moodle.org/dev/Web_service_API_functions)
     */
    wsfunction: string,
    /**
     * the data to be passed to moodle in the form
     */
    data?: { [key: string]: unknown },
    /**
     * if false, when a network error occours this function will throw, if
     * true the call will be retried every 2 seconds until a connection can be established, then
     *  the function will resolve normally - default is true
     */
    catchNetworkError = true,
    /**
     * UUID for logging, if not specified a new one will be generated, passed only when retrying
     */
    callUID = generateUID(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    debug(`API call [${callUID}] to function: ${wsfunction}`)
    if (data) debug(`    data: ${JSON.stringify(data)}`)

    if (!loginManager.isLogged) {
      debug(`Aborting call [${callUID}]: logged out`)
      return
    }
    try {
      const res = await got.post(
        "https://webeep.polimi.it/webservice/rest/server.php",
        {
          timeout: { request: 10000 },
          form: {
            wstoken: loginManager.token,
            wsfunction,
            moodlewsrestformat: "json",
            moodlewssettingfilter: true,
            moodlewssettinglang: "it", // TODO: to be changed for multilanguage
            ...data,
          },
        },
      )
      const parsed = JSON.parse(res.body)
      if (parsed.errorcode === "invalidtoken") {
        debug(`Invalid token on call [${callUID}], requesting new token`)
        const logged = await loginManager.createLoginWindow()
        if (logged)
          return await this.call(wsfunction, data, catchNetworkError, callUID)
      } else {
        this.setConnected(true)
        debug(`API call [${callUID}] success`)
        return parsed
      }
    } catch (e) {
      // @ts-expect-error delete on undefined does nothing, this info is useless, i want it gone
      delete e.timings
      debug(
        `Network error on call [${callUID}], catching: ${catchNetworkError}`,
      )
      debug(e)
      this.setConnected(false)
      if (catchNetworkError) {
        return await new Promise((resolve, reject) => {
          const tryConnection = async () => {
            try {
              debug(`Retring API call [${callUID}]...`)
              resolve(await this.call(wsfunction, data, false, callUID))
              debug(`Retry successful on call [${callUID}]`)
            } catch (e) {
              setTimeout(() => tryConnection(), 2000)
            }
          }
          tryConnection()
        })
      } else throw e
    }
  }

  /**
   * Get the user id, needed to retrieve the enrolled courses, also retrieves the user's full name
   * @returns the user id
   */
  async getUserID(): Promise<number> {
    const res = await this.call("core_webservice_get_site_info")
    if (!res) throw new Error("Cannot retrieve userID, are you logged in?")
    const { userid, fullname }: { userid: number; fullname: string } = res
    this.username = fullname
    this.emit("username", fullname)
    this.userid = userid
    return userid
  }

  /**
   * Retrieves the user's enrolled courses, should be called when it's critical to retrieve
   * the correct courses (e.g while searching for new files while syncing), in other cases (e.g
   * when displaying courses in the UI) use {@link getCourses}
   * @param catchNetworkError if set to true, doesn't throw on fail, instead keeps retrying until
   * it succeedes
   * @returns A promise which resolves with the list of the enrolled courses
   */
  async getCoursesWithoutCache(catchNetworkError = false): Promise<Course[]> {
    await storeIsReady()
    const userid = this.userid ?? (await this.getUserID())

    // once the store is initialized fetch and parse the courses
    const courses: {
      fullname: string
      id: number
    }[] = await this.call(
      "core_enrol_get_users_courses",
      { userid },
      catchNetworkError,
    )
    const defaultNames = courses.map(c => getDefaultName(c.fullname))
    const c: Course[] = courses.map((c, i) => {
      const { id, fullname } = c

      if (!store.data.persistence.courses[id]) {
        // check if there are multiple courses that would be shortened to the same folder
        const allInstances = defaultNames.reduce((arr, el, j) => {
          if (el === defaultNames[i]) {
            arr.push(j)
          }
          return arr
        }, [] as number[])

        store.data.persistence.courses[id] = {
          // if multiple courses share the same name, just use the fullname instead
          name: allInstances.length > 1 ? fullname : defaultNames[i],
          shouldSync: store.data.settings.syncNewCourses,
        }
      }

      return {
        id,
        fullname,
        ...store.data.persistence.courses[id],
      }
    })

    store.write()
    this.emit("courses", c)
    this.cachedCourses = c
    return c
  }

  /**
   * Get the user's enrolled courses. If the API call cannot be established, this function returns
   * previously cached courses, then when tha call finally resolves, the updated courses will be
   * passed to the 'courses' event. Should be used only when it's not necessary for the courses to
   * be absolutely correct, in that case {@link getCoursesWithoutCache} should be used
   * @returns A promise which resolves with the list of the enrolled courses
   */
  getCourses(): Course[] {
    if (!this.waitingForCourses) {
      // if not already waiting for the api resposne, make the call and retrieve updated courses
      this.waitingForCourses = true
      this.getCoursesWithoutCache(true).then(() => {
        this.waitingForCourses = false
      })
    }
    return this.cachedCourses
  }

  /**
   * this function calls the moodle api to get all the files to be downloaded from a specified
   * course
   * @param course the course object from {@link getCourses}
   * @returns a promise that resolve to an array with all the FileInfo objects
   */
  async getFileInfos(course: Course): Promise<FileInfo[]> {
    const contents: Contents = await this.call(
      "core_course_get_contents",
      { courseid: course.id },
      false,
    )
    const files: FileInfo[] = []

    for (const contentGroup of contents) {
      for (const module of contentGroup.modules) {
        const { name: modulename, contents, modname } = module

        // if the modname is excluded or if the module is empty, skip this module,
        if (EXCLUDED_MODNAMES.includes(modname)) continue
        if (!contents) continue

        for (const file of contents) {
          if (file.type !== "file") continue // only add files to the download (duh)

          let {
            filename,
            filepath,
            filesize,
            fileurl,
            timecreated,
            timemodified,
          } = file

          // if the modname is 'resource' & the content is a single file, the modulename
          // should be used in place of the filename, as thats how it's displayed on webeep
          if (modname === "resource" && contents.length === 1) {
            filename = modulename + path.extname(filename)
          } else {
            filepath = path.join(modulename, filepath)
          }

          // remove slashes from the filname to prevent subfolders
          filename = filename.replace(/\//g, "_")
          filename = filename.replace(/\\/g, "_")

          // if the contentgroup is 'Materiali' or similar, do not create a subfolder, as many courses
          // use it as the only folder with downloadable contents
          filepath = contentGroup.name.toLowerCase().includes("material")
            ? filepath
            : path.join(contentGroup.name, filepath)

          filepath = path.join(course.name, filepath)

          // in the end sanitize the path removing all characters that cause a mess
          filename = sanitizePath(filename)
          filepath = sanitizePath(filepath)

          // if there is a file with the same name in the same folder, add a number to the end
          let i = 1
          while (
            files.find(f => f.filepath === filepath && f.filename === filename)
          ) {
            let basename = path.basename(filename, path.extname(filename))
            // remove the old number
            if (i > 1) basename = basename.slice(0, -3 - String(i - 1).length)
            // reconstruct the filename
            filename = `${basename} (${i})${path.extname(filename)}`
            i++
          }

          files.push({
            coursename: course.name,
            filename,
            filepath,
            filesize,
            fileurl,
            timecreated,
            timemodified,
          })
        }
      }
    }

    return files
  }

  /**
   * Gets all notifications from the moodle API, as displayed on the webpage
   *
   * Sets the notification cache on call completion and emits the 'notifications' event
   * @returns a promise that resolves to an array with all the Notification objects
   */
  async getNotifications(): Promise<MoodleNotification[]> {
    try {
      // this call can fail silently, the notifications will just not be updated
      // an update will occur anyway when the notifications are checked in the background
      const nots: {
        notifications: {
          id: number
          subject: string
          fullmessage: string
          fullmessagehtml: string
          contexturl: string
          timecreated: number
          read: boolean
          eventtype: string
          customdata: string
        }[]
      } = await this.call(
        "message_popup_get_popup_notifications",
        { useridto: 0 },
        false,
      )

      const notifications: MoodleNotification[] = nots.notifications
        .filter(n => n.eventtype === "posts")
        .map(n => {
          let courseid: string | undefined
          try {
            courseid = JSON.parse(n.customdata).courseid
          } catch (e) {
            /* no course id found */
          }

          return {
            id: n.id,
            title: n.subject,
            htmlbody: n.fullmessagehtml,
            timecreated: n.timecreated,
            url: n.contexturl,
            read: n.read,
            courseid,
          }
        })

      this.cachedNotifications = notifications
      this.emit("notifications", notifications)
      return notifications
    } catch (e) {
      // return the cache if the call fails
      return this.cachedNotifications
    }
  }

  /**
   * Sets the given notification as read
   * @param notificationID the id of the notification to be marked as read
   */
  async markNotificationAsRead(notificationID: number): Promise<void> {
    // update the cache to avoid showing the notification as unread again
    this.cachedNotifications = this.cachedNotifications.map(n => {
      if (n.id === notificationID) n.read = true
      return n
    })
    this.emit("notifications", this.cachedNotifications) // notify the frontend
    // actually call the api to mark the notification as read
    // done after updating the cache to mark the notification as read even without internet
    // the call will eventually make it through when the user reconnects
    await this.call("core_message_mark_notification_read", {
      notificationid: notificationID,
    })
  }

  /**
   * Marks all notifications as read
   * Same as {@link markNotificationAsRead} but for all notifications instead of just one
   *
   * this also marks every notification that isn't shown in webeep sync as read,
   * like the ones for new materials uploaded.
   */
  async markAllNotificationsAsRead(): Promise<void> {
    // update cache before call as optimistic update
    this.cachedNotifications = this.cachedNotifications.map(n => {
      n.read = true
      return n
    })
    this.emit("notifications", this.cachedNotifications) // notify the frontend
    await this.call("core_message_mark_all_notifications_as_read", {
      useridto: this.userid,
    })
  }
}
export const moodleClient = new MoodleClient()
