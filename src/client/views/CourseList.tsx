import React, { FC, useState } from 'react'
import { Course } from '../../helpers/moodle'
import { CourseRow } from '../components/CourseRow'

export let CourseList: FC<{ courses: Course[] }> = (props) => {
    let [shadow, setShadow] = useState(false)

    return <div className="course-list section">
        <div className={`course-header ${shadow ? 'shadow' : undefined}`}>
            <h3>Courses</h3>
            <span>Select which courses you want to keep synced and rename the folders</span>
        </div>
        <div className="course-container" onScroll={e => {
            if (e.currentTarget.scrollTop > 5 && !shadow) setShadow(true)
            else if (e.currentTarget.scrollTop <= 5 && shadow) setShadow(false)
        }}>
            {props.courses.map((course, i) => <CourseRow
                course={course}
                index={i}
                key={'courserow' + course.id}
            />)}
        </div>
    </div>
}