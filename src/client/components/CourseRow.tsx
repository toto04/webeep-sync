import React, { FC, useState } from 'react'
import { Checkbox } from './Checkbox'
import { Course } from '../../modules/moodle'
import { ipcRenderer } from 'electron'
import { IoClose, IoAddCircleOutline, IoCheckmarkCircle } from 'react-icons/io5'
import { HiCheck } from 'react-icons/hi'
import { useTranslation } from 'react-i18next'

export let CourseRow: FC<{ course: Course, index: number }> = (props) => {
    let [input, setInput] = useState<HTMLInputElement>()
    let [checked, setChecked] = useState(props.course.shouldSync)
    let [folder, setFolder] = useState(props.course.name)
    let [editing, setEditing] = useState(false)

    let { t } = useTranslation('client', { keyPrefix: 'courseList.row' })

    let checkInputValidity = () => {
        if (input.value.length < 1)
            input.setCustomValidity(t('tooShort'))
        else if (input.value.length >= 255)
            input.setCustomValidity(t('tooLong'))
        else if (!/^[^:*?"<>|]*$/.test(input.value))
            input.setCustomValidity(t('invalidCharacters') + ':*?"<>|')
        else input.setCustomValidity('')
    }

    let cancelEditing = () => {
        setFolder(props.course.name)
        setEditing(false)
        input.blur()
    }

    let confirmEditing = async () => {
        checkInputValidity()
        if (input.validity.valid) {
            // updates the state with the trimmed string
            setFolder(folder.trim())
            // send the trimmed string to the backend
            let success = await ipcRenderer.invoke('rename-course', props.course.id, folder.trim())
            if (success) {
                // if the folder was renamed successfully, exit editing and unfocus the input
                setEditing(false)
                input.blur()
            } else {
                // else output a custom validity report explaining the error while renaming the folder
                input.setCustomValidity(t('errPerm'))
                input.reportValidity()
            }
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
                ref={i => setInput(i)}
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
                onChange={e => {
                    checkInputValidity()
                    setFolder(e.target.value.trimStart())   // prevent space from the start
                }}
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