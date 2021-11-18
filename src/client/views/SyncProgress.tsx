import { ipcRenderer } from 'electron'
import { FC, useEffect, useState } from 'react'
import { PrograssBar } from '../components/ProgressBar'
import React from 'react'

import { DownloadState, formatSize, SyncResult } from '../../util'
import { NewFilesList, Progress } from '../../helpers/download'
import { NewFilesModal } from './NewFilesModal'

let statusMessages = [
    'ready to download',
    'fetching courses...',
    'looking for new files to download...',
    'downloading...'
]

let resultMessage = [
    '', '', // the first two results in the enum are not accessible by the message
    'syncing aborted',
    'cannot reach the server, check your connection or try again later',
    'cannot write the file, do you have write permission to the download folder?',
    'an unknown error has occured, try again later'
]

export let SyncProgress: FC = props => {
    let [progress, setProgress] = useState<Progress>()
    let [downloadState, setDownloadState] = useState<DownloadState>(DownloadState.idle)
    let [syncResult, setSyncResult] = useState<SyncResult>()

    let [viewingFiles, setViewingFiles] = useState(false)
    let [newFilesList, setNewFilesList] = useState<NewFilesList>()

    useEffect(() => {
        ipcRenderer.on('progress', (e, progress: Progress) => setProgress(progress))
        ipcRenderer.on('download-state', (e, state: DownloadState) => setDownloadState(state))
        ipcRenderer.on('sync-result', (e, result: SyncResult) => setSyncResult(result))
        ipcRenderer.on('new-files', (e, files: NewFilesList) => setNewFilesList(files))
    }, [])

    let filePercentage = progress?.fileDownloaded / progress?.fileTotal
    let percentage = progress?.downloaded / progress?.total

    let numfiles = 0
    for (let course in newFilesList) {
        numfiles += newFilesList[course].length
    }

    return <div className="sync-progress section">
        {downloadState === DownloadState.downloading && progress
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
                {
                    syncResult === SyncResult.success
                        ? <div className="new-files">
                            <h3>{numfiles} new files downloaded</h3>
                            <button
                                className="confirm-button"
                                onClick={() => setViewingFiles(true)}
                                disabled={numfiles === 0}
                            >
                                view files
                            </button>
                        </div>
                        : (downloadState === DownloadState.idle && syncResult
                            ? <h3 className="error">{resultMessage[syncResult]}</h3>
                            : <h3>{statusMessages[downloadState]}</h3>
                        )
                }
            </div>
        }
        {viewingFiles
            ? <NewFilesModal
                files={newFilesList}
                onClose={() => setViewingFiles(false)}
            />
            : undefined
        }
    </div >
}