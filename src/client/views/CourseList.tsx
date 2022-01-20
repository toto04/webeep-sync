import React, { FC, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Course } from '../../modules/moodle'
import { CourseRow } from '../components/CourseRow'

export let CourseList: FC<{ courses: Course[] }> = (props) => {
    let [shadow, setShadow] = useState(false)
    let { t } = useTranslation('client', { keyPrefix: 'courseList' })

    return <div className="course-list section">
        <div className={`course-header ${shadow ? 'shadow' : undefined}`}>
            <h3>{t('courses')}</h3>
            <span>{t('courses_desc')}</span>
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