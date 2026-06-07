import React, { FC, useState } from "react"
import { useTranslation } from "react-i18next"
import { Course } from "../../modules/moodle"
import { CourseRow } from "../components/CourseRow"
import { ipcRenderer } from "electron"

export const CourseList: FC<{ courses: Course[] }> = props => {
  const [shadow, setShadow] = useState(false)
  const { t } = useTranslation("client", { keyPrefix: "courseList" })

  const allSelected = props.courses.every(c => c.shouldSync)
  const toggleAll = () => {
    ipcRenderer.send("set-should-sync-all", !allSelected)
  }

  return (
    <div className="course-list section" style={{ position: "relative" }}>
      <button
        className="discard-button"
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          padding: "4px 12px",
          fontSize: "0.8em",
          borderRadius: "12px",
          zIndex: 10,
        }}
        onClick={toggleAll}
      >
        {allSelected ? t("deselectAll") : t("selectAll")}
      </button>
      <div className={`course-header ${shadow ? "shadow" : ""}`}>
        <h3>{t("courses")}</h3>
        <span>{t("courses_desc")}</span>
      </div>
      <div
        className="course-container"
        onScroll={e => {
          if (e.currentTarget.scrollTop > 5 && !shadow) setShadow(true)
          else if (e.currentTarget.scrollTop <= 5 && shadow) setShadow(false)
        }}
      >
        {props.courses.map((course, i) => (
          <CourseRow
            course={course}
            index={i}
            length={props.courses.length}
            key={"courserow" + course.id}
          />
        ))}
      </div>
    </div>
  )
}
