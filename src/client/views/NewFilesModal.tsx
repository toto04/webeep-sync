import React, { FC, useState } from 'react'

import { IoCaretForward, IoCaretDown, IoFolderOpen, IoOpen, IoClose } from 'react-icons/io5'

import { Modal } from '../components/Modal'
import { formatSize, breakableString } from '../../util'
import { NewFilesList } from '../../modules/download'
import { shell } from 'electron'
import { useTranslation } from 'react-i18next'

let NewFilesCourseCollapsable: FC<{ name: string, files: NewFilesList[string] }> = props => {
    let [isOpen, toggle] = useState(true)
    let { t } = useTranslation('client', { keyPrefix: 'newFiles' })

    return <div className="course-collapsable">
        <h4 onClick={() => toggle(!isOpen)}>
            {isOpen ? <IoCaretDown /> : <IoCaretForward />} {props.name} ({props.files.length})
        </h4>
        {isOpen
            ? props.files.map(file =>
                <div className={'new-file' + (file.updated ? ' updated' : '')} key={props.name + file.absolutePath} >
                    <div className="fileinfo">
                        <span className="filename">{breakableString(file.filename)}</span>
                        <span className="filepath">
                            {breakableString(file.absolutePath)}
                        </span>
                    </div>
                    <span className="filesize">
                        {formatSize(file.filesize)}
                    </span>
                    <div className="clickable" onClick={() => {
                        shell.showItemInFolder(file.absolutePath)
                    }}>
                        <IoFolderOpen />
                        <span>{t(`reveal`)}</span>
                    </div>
                    <div className="clickable" onClick={() => {
                        shell.openPath(file.absolutePath)
                    }}>
                        <IoOpen />
                        <span>{t(`open`)}</span>
                    </div>
                </div>)
            : undefined}
    </div>
}

export let NewFilesModal: FC<{ onClose: () => void, files: NewFilesList }> = (props) => {
    let { t } = useTranslation('client', { keyPrefix: 'newFiles' })

    let count = 0
    for (let course in props.files) {
        count += props.files[course].length
    }
    return <Modal title={t(`newFiles`, { count })} onClose={() => props.onClose()}>
        <div className="new-files-modal">
            {Object.entries(props.files).map(([course, files]) => <NewFilesCourseCollapsable
                key={'collaps' + course}
                name={course}
                files={files}
            />)}
        </div>
    </Modal>
}