import React, { FC } from 'react'
import { Course } from '../../helpers/moodle'
import { CourseRow } from '../components/CourseRow'

export let CourseList: FC<{ courses: Course[] }> = (props) => {
    return <div className="course-container">
        {props.courses.map((course, i) => <CourseRow
            course={course}
            index={i}
            key={'courserow' + course.id}
        />)}
    </div>
}