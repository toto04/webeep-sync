import React, { FC, useContext, useEffect, useState } from 'react'
import { IoPlay, IoPause, IoFolderOpen, IoPencil } from 'react-icons/io5'
import { shell } from 'electron'
import { ipcRenderer } from 'electron'

import { PrograssBar } from '../components/ProgressBar'
import { Progress } from '../../helpers/download'

import { LoginContext } from '../LoginContext'

function centralEllipses(s: string) {
    if (s.length > 32) return s.substr(0, 10) + '...' + s.substr(-20)
}

export function formatSize(size: number): string {
    let suxs = ['B', 'kB', 'MB', 'GB', 'TB']
    let i = 0;
    while (size > 1000 && i < suxs.length - 1) {
        size /= 1000
        i++
    }
    return size.toFixed(1) + suxs[i]
}

export let SyncStatus: FC = props => {

    let [path, setPath] = useState('...')
    let [autosync, setAutosync] = useState(false)

    let { syncing } = useContext(LoginContext)
    let [progress, setProgress] = useState<Progress>()

    useEffect(() => {
        ipcRenderer.on('download-path', (e, path: string) => setPath(path))
        ipcRenderer.on('autosync', (e, sync: boolean) => setAutosync(sync))
        ipcRenderer.send('sync-status')

        ipcRenderer.on('progress', (e, progress: Progress) => setProgress(progress))
    }, [])

    let filePercentage = progress?.fileDownloaded / progress?.fileTotal
    let percentage = progress?.downloaded / progress?.total

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

                <h3>Autosync is {autosync ? 'on' : 'off'}</h3>
            </div>
        </div>
        <div className="sync-progress">
            <h3>Sync Progress</h3>
            {progress
                ? <div className="sync-progress-wrap">
                    <div className="progress-container">
                        <span style={{ fontWeight: 'bold', display: 'block' }}>
                            {centralEllipses(progress.fileName)}
                        </span>
                        <span className="right">
                            {`${formatSize(progress.fileDownloaded)}/${formatSize(progress.fileTotal)} (${Math.floor(filePercentage * 100)}%)`}
                        </span>
                        <PrograssBar progress={filePercentage} />
                    </div>
                    <div className="progress-container">
                        <span>total</span>
                        <span className="right">
                            {`${formatSize(progress.downloaded)}/${formatSize(progress.total)} (${Math.floor(percentage * 100)}%)`}
                        </span>
                        <PrograssBar progress={percentage} />
                    </div>
                </div>
                : <div className="sync-progress-idle">
                    {syncing ? 'waiting for download' : 'ready to sync'}
                </div>
            }
        </div>
    </div>
}