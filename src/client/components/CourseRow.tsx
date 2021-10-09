import React, { FC } from 'react'
import { Course } from '../../moodle'

export let CourseRow: FC<{ course: Course }> = (props) => {
    return <div className="course-row">
        {/* <input type="checkbox" name="" id="" /> */}
        <span>{props.course.name}</span>
    </div>
}