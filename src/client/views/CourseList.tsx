import React, { FC } from 'react'
import { Course } from '../../moodle'
import { CourseRow } from '../components/CourseRow'

export let CourseList: FC<{ courses: Course[] }> = (props) => {
    return <div className="course-container">
        {props.courses.map(course => <CourseRow course={course} key={'courserow' + course.id} />)}
    </div>
}