import React, { FC, useEffect, useState } from 'react'
import { IoPlay, IoPause, IoFolderOpen, IoPencil } from 'react-icons/io5'
import { shell } from 'electron'
import { ipcRenderer } from 'electron'

export let SyncSettings: FC = props => {

    let [path, setPath] = useState('...')
    let [autosync, setAutosync] = useState(false)

    useEffect(() => {
        ipcRenderer.on('download-path', (e, path: string) => setPath(path))
        ipcRenderer.on('autosync', (e, sync: boolean) => setAutosync(sync))
        ipcRenderer.send('sync-settings')
    }, [])

    return <div className="sync-settings section">
        <div className="download-path">
            <h3>Download Folder</h3>
            <span className="path">{path}</span>
            <div className="clickable" onClick={() => {
                shell.openPath(path)
            }}>
                <IoFolderOpen />
                <span>open</span>
            </div>
            <div className="clickable" onClick={() => {
                ipcRenderer.send('select-download-path')
            }} >
                <IoPencil />
                <span>edit</span>
            </div>
        </div>
        <div className="autosync">
            <h3>Autosync is {autosync ? 'on' : 'off'}</h3>

            {autosync ? <IoPause className="clickable danger" onClick={() => {
                ipcRenderer.send('set-autosync', false)
            }} /> : <IoPlay className="clickable positive" onClick={() => {
                ipcRenderer.send('set-autosync', true)
            }} />}
        </div>
    </div>
}