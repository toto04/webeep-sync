import React, { FC, useState } from 'react'
import { Checkbox } from './Checkbox'
import { Course } from '../../helpers/moodle'
import { ipcRenderer } from 'electron'
import { IoClose, IoAddCircleOutline, IoCheckmarkCircle } from 'react-icons/io5'
import { HiCheck } from 'react-icons/hi'

let input: HTMLInputElement

export let CourseRow: FC<{ course: Course, index: number }> = (props) => {
    let [checked, setChecked] = useState(props.course.shouldSync)
    let [folder, setFolder] = useState(props.course.name)
    let [editing, setEditing] = useState(false)

    let cancelEditing = () => {
        setFolder(props.course.name)
        setEditing(false)
        input.blur()
    }

    let confirmEditing = async () => {
        // check input validity
        if (input.value.length < 1)
            input.setCustomValidity('value cannot be empty')
        else if (input.value.length >= 255)
            input.setCustomValidity('too long!')
        else if (!/^[^:*?"<>|]*$/.test(input.value))
            input.setCustomValidity('you cannot use these charactes: :*?"<>|')
        else input.setCustomValidity('')

        if (input.validity.valid) {
            await ipcRenderer.invoke('rename-course', props.course.id, folder)
            setEditing(false)
            input.blur()
        } else { input.reportValidity() }
    }

    return <div className="course-row">
        <Checkbox
            value={checked}
            color={`hsl(${props.index * 40}, 80%, 55%)`}
            PositiveIcon={IoCheckmarkCircle}
            NegativeIcon={IoAddCircleOutline}
            onChange={v => {
                ipcRenderer.send('set-should-sync', props.course.id, v)
                setChecked(v)
            }}
        />
        <div className="course-folder-info">
            <span>{props.course.fullname}</span>
            <input
                ref={i => input = i}
                className={editing ? 'editing' : undefined}
                type="text"
                value={folder}
                onKeyDown={e => {
                    // handles keyboard events while editing, escape to cancel and eneter to confirm
                    if (!editing) return
                    if (e.key === "Escape") {
                        e.preventDefault()
                        cancelEditing()
                    } else if (e.key === "Enter") {
                        e.preventDefault()
                        confirmEditing()
                    }
                }}
                onChange={e => setFolder(e.target.value)}
                onFocus={() => setEditing(true)}
                onBlur={() => {
                    if (props.course.name === folder) setEditing(false)
                }}
            />
        </div>
        <div className="editing-icons" style={{ visibility: editing ? undefined : 'hidden' }}>
            <IoClose className="clickable" color="#ff3b30" onClick={cancelEditing} />
            <HiCheck className="clickable" color="#34c759" onClick={confirmEditing} />
        </div>
    </div >
}