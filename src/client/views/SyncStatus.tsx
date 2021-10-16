import React, { FC, useEffect, useState } from 'react'
import { IoPlay, IoPause, IoFolderOpen, IoPencil } from 'react-icons/io5'
import { shell } from 'electron'
import { ipcRenderer } from 'electron'

export let SyncStatus: FC = props => {

    let [path, setPath] = useState('...')
    let [autosync, setAutosync] = useState(false)

    useEffect(() => {
        ipcRenderer.on('download-path', (e, path: string) => setPath(path))
        ipcRenderer.on('autosync', (e, sync: boolean) => setAutosync(sync))
        ipcRenderer.send('sync-status')
    }, [])

    return <div className="sync-status section">
        <div className="sync-settings">
            <div className="download-path">
                <h3>Download Folder</h3>
                <span>{path}</span>
                <IoFolderOpen className="clickable" onClick={() => {
                    shell.openPath(path)
                }} />
                <IoPencil className="clickable" onClick={() => {
                    ipcRenderer.send('select-download-path')
                }} />
            </div>
            <div className="autosync">
                {autosync ? <IoPause className="clickable danger" onClick={() => {
                    ipcRenderer.send('set-autosync', false)
                }} /> : <IoPlay className="clickable positive" onClick={() => {
                    ipcRenderer.send('set-autosync', true)
                }} />}

                <span>Autosync is {autosync ? 'on' : 'off'}</span>
            </div>
        </div>
        <div className="progress"></div>
    </div>
}