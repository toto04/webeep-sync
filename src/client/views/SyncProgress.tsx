import { ipcRenderer } from 'electron'
import { FC, useContext, useEffect, useState } from 'react'
import { PrograssBar } from '../components/ProgressBar'
import React from 'react'

import { DownloadState, formatSize, SyncResult } from '../../util'
import { NewFilesList, Progress } from '../../helpers/download'
import { NewFilesModal } from './NewFilesModal'
import { LoginContext } from '../LoginContext'
import { useTranslation } from 'react-i18next'

/**
 * This component is what is shown while there is a download in progress.
 * Shows progress bars with download percentage and path of the files being downloaded
 */
let SyncProgressWrap: FC<{ progress: Progress }> = props => {
    let { t } = useTranslation('client', { keyPrefix: 'syncProgress' })

    let { progress } = props

    let filePercentage = progress?.fileDownloaded / progress?.fileTotal
    let percentage = progress?.downloaded / progress?.total

    return <div className="sync-progress-wrap">
        <div>
            <div className="progress-container">
                <div className="fileinfo">
                    <span className="filename">{progress.filename}</span>
                    <span className="filepath">
                        {progress.absolutePath.replace(/\\/g, '\\\u200B').replace(/\//g, '/\u200B')}
                    </span>
                </div>
                <span className="right">
                    {`${formatSize(progress.fileDownloaded)} / ${formatSize(progress.fileTotal)} (${Math.floor(filePercentage * 100)}%)`}
                </span>
            </div>
            <PrograssBar progress={filePercentage} />
        </div>

        <div>
            <h3>{t('total')}</h3>
            <span className="right">
                {`${formatSize(progress.downloaded)} / ${formatSize(progress.total)} (${Math.floor(percentage * 100)}%)`}
            </span>
            <PrograssBar progress={percentage} />
        </div>
    </div>
}

/**
 * This component is the view inside of which the progress of the sync progress is displayed.
 * 
 * shows different messages depending on the state of the download process, or different errors
 * depending on the sync result. While downloading, shows the progress bars
 */
export let SyncProgress: FC = props => {
    let { connected, isLogged } = useContext(LoginContext)

    let { t } = useTranslation('client', { keyPrefix: 'syncProgress' })

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

    let numfiles = 0
    for (let course in newFilesList) {
        numfiles += newFilesList[course].length
    }

    let elem: JSX.Element

    // switch for handling what to show at different stages of the downloda
    switch (downloadState) {
        case DownloadState.idle:
            if (syncResult !== undefined) {
                // if the download state is idle, only when there is a result to display
                // if there are new files, show how many and the "view files" button
                // otherwise, show an error when the syncresult is not success, or the success msg
                elem = <div className="sync-progress-idle">{
                    (syncResult === SyncResult.success && numfiles !== 0)
                        ? <div className="new-files">
                            <h3>{t('newFiles', { count: numfiles })}</h3>
                            <button
                                className="confirm-button"
                                onClick={() => setViewingFiles(true)}
                                disabled={numfiles === 0}
                            >
                                {t('viewFiles')}
                            </button>
                        </div>
                        : <h3 className={syncResult ? "error" : undefined}>
                            {t(`resultMessage.${SyncResult[syncResult]}`)}
                        </h3>
                }</div>
                break;
            } else if (!connected) {
                elem = <div className="sync-progress-idle">
                    <h3>{t('noConnection')}</h3>
                </div>
                break;
            } else if (!isLogged) {
                elem = <div className="sync-progress-idle">
                    <h3>{t('noLogin')}</h3>
                </div>
                break;
            }
        case DownloadState.downloading:
            if (progress) {
                // if the download state is downloading, only when there is progress to display
                // show the progress bars & info of the download
                elem = <SyncProgressWrap progress={progress} />
                break;
            }
        default:
            // in every other cases, just show the correct status message
            elem = <div className="sync-progress-idle">
                <h3>{t(`statusMessage.${DownloadState[downloadState]}`)}</h3>
            </div>
    }

    return <div className="sync-progress section">
        {elem}
        {viewingFiles
            ? <NewFilesModal
                files={newFilesList}
                onClose={() => setViewingFiles(false)}
            />
            : undefined
        }
    </div >
}