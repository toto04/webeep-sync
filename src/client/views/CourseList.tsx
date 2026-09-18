import React, { FC, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { ipcRenderer } from "electron"
import { Course } from "../../modules/moodle"
import { CourseRow } from "../components/CourseRow"

// matches the academic year tag in course names, e.g. "[2026-27]" or "[A.A. 2026-27]"
const yearRegex = /\[(?:A\.?A\.?\s*)?(\d{4}-\d{2})\]/i
// special filter value for courses without an academic year tag
const OTHER = "other"
// localStorage key remembering the selected filter across restarts
const FILTER_STORAGE_KEY = "courseListYearFilter"

function getAcademicYear(fullname: string): string | undefined {
  return fullname.match(yearRegex)?.[1]
}

// lowercases and strips accents, so that "citta" matches "Città"
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export const CourseList: FC<{ courses: Course[] }> = props => {
  const [shadow, setShadow] = useState(false)
  const [selectedYear, setSelectedYear] = useState<string | undefined>(
    () => localStorage.getItem(FILTER_STORAGE_KEY) ?? undefined,
  )
  const [search, setSearch] = useState("")
  const [checked, setChecked] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(props.courses.map(c => [c.id, c.shouldSync])),
  )
  // id of the last clicked course, used as the anchor for shift-click range selection
  const lastClickedId = useRef<number>()
  const { t } = useTranslation("client", { keyPrefix: "courseList" })

  // academic years found in the course names, most recent first
  const years = useMemo(() => {
    const set = new Set<string>()
    for (const course of props.courses) {
      const year = getAcademicYear(course.fullname)
      if (year) set.add(year)
    }
    return Array.from(set).sort().reverse()
  }, [props.courses])

  const hasUntaggedCourses = useMemo(
    () => props.courses.some(c => !getAcademicYear(c.fullname)),
    [props.courses],
  )

  // show the filter only when there is actually something to filter
  const showFilter =
    years.length > 1 || (years.length === 1 && hasUntaggedCourses)

  useEffect(() => {
    // sync the checked state when the courses get updated from the main process
    setChecked(Object.fromEntries(props.courses.map(c => [c.id, c.shouldSync])))
  }, [props.courses])

  const selectYear = (year?: string) => {
    setSelectedYear(year)
    // remember the selected filter for the next launch
    if (year) localStorage.setItem(FILTER_STORAGE_KEY, year)
    else localStorage.removeItem(FILTER_STORAGE_KEY)
  }

  // if the selected year disappears after a course update, fall back to showing everything
  const activeYear =
    selectedYear &&
    (years.includes(selectedYear) ||
      (selectedYear === OTHER && hasUntaggedCourses))
      ? selectedYear
      : undefined

  // visible courses paired with their original index, so that each course keeps
  // its checkbox color (which depends on the index) regardless of the filter
  const visibleCourses = useMemo(() => {
    // every word of the query must appear in the full name or in the folder name
    const words = normalize(search)
      .split(/\s+/)
      .filter(w => w.length > 0)
    return props.courses
      .map((course, index) => ({ course, index }))
      .filter(({ course }) => {
        if (activeYear) {
          const year = getAcademicYear(course.fullname)
          if (activeYear === OTHER ? year : year !== activeYear) return false
        }
        const haystack = normalize(course.fullname + " " + course.name)
        return words.every(w => haystack.includes(w))
      })
  }, [props.courses, activeYear, search])

  const setShouldSync = (ids: number[], value: boolean) => {
    const changed = ids.filter(id => checked[id] !== value)
    if (changed.length === 0) return
    for (const id of changed) ipcRenderer.send("set-should-sync", id, value)
    setChecked(prev => {
      const next = { ...prev }
      for (const id of changed) next[id] = value
      return next
    })
  }

  const handleCheckChange = (
    courseId: number,
    value: boolean,
    shiftKey: boolean,
  ) => {
    const anchorId = lastClickedId.current
    lastClickedId.current = courseId
    if (shiftKey && anchorId !== undefined && anchorId !== courseId) {
      const visibleIds = visibleCourses.map(({ course }) => course.id)
      const from = visibleIds.indexOf(anchorId)
      const to = visibleIds.indexOf(courseId)
      if (from !== -1 && to !== -1) {
        const [start, end] = from < to ? [from, to] : [to, from]
        setShouldSync(visibleIds.slice(start, end + 1), value)
        return
      }
    }
    setShouldSync([courseId], value)
  }

  const allVisibleChecked =
    visibleCourses.length > 0 &&
    visibleCourses.every(({ course }) => checked[course.id])

  return (
    <div className="course-list section">
      <div className={`course-header ${shadow ? "shadow" : ""}`}>
        <h3>{t("courses")}</h3>
        <span>{t("courses_desc")}</span>
        <input
          className="course-search"
          type="search"
          placeholder={t("search")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Escape") setSearch("")
          }}
        />
        <div className="course-toolbar">
          {showFilter ? (
            <div className="year-filters">
              <button
                className={activeYear === undefined ? "selected" : undefined}
                onClick={() => selectYear(undefined)}
              >
                {t("filter.all")}
              </button>
              {years.map(year => (
                <button
                  key={year}
                  className={activeYear === year ? "selected" : undefined}
                  onClick={() => selectYear(year)}
                >
                  {year}
                </button>
              ))}
              {hasUntaggedCourses ? (
                <button
                  className={activeYear === OTHER ? "selected" : undefined}
                  onClick={() => selectYear(OTHER)}
                >
                  {t("filter.other")}
                </button>
              ) : undefined}
            </div>
          ) : (
            <div />
          )}
          <button
            className="select-all"
            onClick={() =>
              setShouldSync(
                visibleCourses.map(({ course }) => course.id),
                !allVisibleChecked,
              )
            }
          >
            {allVisibleChecked ? t("deselectAll") : t("selectAll")}
          </button>
        </div>
      </div>
      <div
        className="course-container"
        onScroll={e => {
          if (e.currentTarget.scrollTop > 5 && !shadow) setShadow(true)
          else if (e.currentTarget.scrollTop <= 5 && shadow) setShadow(false)
        }}
      >
        {visibleCourses.map(({ course, index }) => (
          <CourseRow
            course={course}
            index={index}
            length={props.courses.length}
            checked={checked[course.id] ?? course.shouldSync}
            onCheckChange={(v, shiftKey) =>
              handleCheckChange(course.id, v, shiftKey)
            }
            key={"courserow" + course.id}
          />
        ))}
        {visibleCourses.length === 0 ? (
          <div className="no-courses">{t("noResults")}</div>
        ) : undefined}
      </div>
    </div>
  )
}
