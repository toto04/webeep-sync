import React, { FC, useState } from 'react'
import { Checkbox } from './Checkbox'
import { Course } from '../../moodle'
import { ipcRenderer } from 'electron'

export let CourseRow: FC<{ course: Course, index: number }> = (props) => {
    let [checked, setChecked] = useState(props.course.shouldSync)
    return <div className="course-row">
        <Checkbox
            value={checked}
            color={`hsl(${props.index * 40}, 80%, 55%)`}
            onChange={v => {
                ipcRenderer.send('set-should-sync', props.course.id, v)
                setChecked(v)
            }}
        />
        <span>{props.course.name}</span>
    </div >
}