import React, { FC, useState } from 'react'

import { IoCaretForward, IoCaretDown, IoFolderOpen, IoOpen, IoClose } from 'react-icons/io5'

import { Modal } from '../components/Modal'
import { formatSize } from '../../util'
import { NewFilesList } from '../../helpers/download'
import { shell } from 'electron'

let NewFilesCourseCollapsable: FC<{ name: string, files: NewFilesList[string] }> = props => {
    let [isOpen, toggle] = useState(true)
    return <div className="course-collapsable">
        <h4 onClick={() => toggle(!isOpen)}>
            {isOpen ? <IoCaretDown /> : <IoCaretForward />} {props.name} ({props.files.length})
        </h4>
        {isOpen
            ? props.files.map(file =>
                <div className={'new-file' + (file.updated ? ' updated' : '')} key={props.name + file.absolutePath} >
                    <div className="fileinfo">
                        <span className="filename">{file.filename}</span>
                        <span className="filepath">
                            {file.absolutePath.replace(/\\/g, '\\\u200B').replace(/\//g, '/\u200B')}
                        </span>
                    </div>
                    <span className="filesize">
                        {formatSize(file.filesize)}
                    </span>
                    <div className="clickable" onClick={() => {
                        shell.showItemInFolder(file.absolutePath)
                    }}>
                        <IoFolderOpen />
                        <span>reveal</span>
                    </div>
                    <div className="clickable" onClick={() => {
                        shell.openPath(file.absolutePath)
                    }}>
                        <IoOpen />
                        <span>open</span>
                    </div>
                </div>)
            : undefined}
    </div>
}

export let NewFilesModal: FC<{ onClose: () => void, files: NewFilesList }> = (props) => {
    let numfiles = 0
    for (let course in props.files) {
        numfiles += props.files[course].length
    }
    return <Modal title={`${numfiles} new files downloaded`} onClose={() => props.onClose()}>
        <div className="new-files-modal">
            {Object.entries(props.files).map(([course, files]) => <NewFilesCourseCollapsable
                key={'collaps' + course}
                name={course}
                files={files}
            />)}
        </div>
    </Modal>
}