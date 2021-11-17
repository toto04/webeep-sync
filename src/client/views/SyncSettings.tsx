import React, { FC, useEffect, useState } from 'react'
import { IoFolderOpen, IoPencil } from 'react-icons/io5'
import { shell } from 'electron'
import { ipcRenderer } from 'electron'
import { Switch } from './Settings'

const hour = 60 * 60 * 1000

export let SyncSettings: FC = props => {

    let [path, setPath] = useState('...')
    let [autosync, setAutosync] = useState(false)
    let [syncInterval, setSyncInterval] = useState(0)

    useEffect(() => {
        ipcRenderer.on('download-path', (e, path: string) => setPath(path))
        ipcRenderer.on('autosync', (e, sync: boolean) => setAutosync(sync))
        ipcRenderer.on('autosync-interval', (e, interval: number) => setSyncInterval(interval))

        ipcRenderer.send('sync-settings')
    }, [])

    return <div className="sync-settings section">
        <div className="download-path section">
            <div style={{ flex: 1 }}>
                <h3>Download Folder</h3>
                <span className="path">{path.replace(/\\/g, '\\\u200B').replace(/\//g, '/\u200B')}</span>
            </div>
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
        <div className="autosync section">
            <div className="autosync-row">
                <h3>Autosync</h3>
                <Switch
                    onChange={v => ipcRenderer.send('set-autosync', v)}
                    checked={autosync}
                    onColor="#34c759"
                    offColor="#ff3b30"
                />
            </div>
            <div className={"autosync-row" + (autosync ? '' : ' disabled')}>
                <span>sync every </span>
                <select disabled={!autosync} value={autosync ? syncInterval / hour : 0} onChange={e => {
                    ipcRenderer.send('set-autosync-interval', parseInt(e.target.value) * hour)
                }}>
                    <option value={0} disabled >---</option>
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={8}>8 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>1 day</option>
                    <option value={48}>2 days</option>
                    <option value={168}>1 week</option>
                </select>
            </div>
        </div>
    </div>
}