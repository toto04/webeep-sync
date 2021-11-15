import { ipcRenderer } from 'electron'
import { FC, useContext, useEffect, useState } from 'react'
import { PrograssBar } from '../components/ProgressBar'
import { Progress } from '../../helpers/download'
import { LoginContext } from '../LoginContext'
import React from 'react'

export function formatSize(size: number): string {
    let suxs = ['B', 'kB', 'MB', 'GB', 'TB']
    let i = 0;
    while (size > 1000 && i < suxs.length - 1) {
        size /= 1000
        i++
    }
    return size.toFixed(1) + suxs[i]
}

export let SyncProgress: FC = props => {

    let { syncing } = useContext(LoginContext)
    let [progress, setProgress] = useState<Progress>()

    useEffect(() => {
        ipcRenderer.on('progress', (e, progress: Progress) => setProgress(progress))
    }, [])

    let filePercentage = progress?.fileDownloaded / progress?.fileTotal
    let percentage = progress?.downloaded / progress?.total

    return <div className="sync-progress section">
        {progress
            ? <div className="sync-progress-wrap">
                <div className="progress-container">
                    <span className="filename">
                        {progress.fileName.replace(/\\/g, '\\\u200B').replace(/\//g, '/\u200B')}
                    </span>
                    <div>
                        <span className="right">
                            {`${formatSize(progress.fileDownloaded)}/${formatSize(progress.fileTotal)} (${Math.floor(filePercentage * 100)}%)`}
                        </span>
                        <PrograssBar progress={filePercentage} />
                    </div>
                </div>
                <div>
                    <h3>total</h3>
                    <span className="right">
                        {`${formatSize(progress.downloaded)}/${formatSize(progress.total)} (${Math.floor(percentage * 100)}%)`}
                    </span>
                    <PrograssBar progress={percentage} />
                </div>
            </div>
            : <div className="sync-progress-idle">
                <h3>{syncing ? 'waiting for download' : 'ready to sync'}</h3>
            </div>
        }
    </div>
}