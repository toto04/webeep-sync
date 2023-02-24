/* eslint-disable no-fallthrough */
import { ipcRenderer } from "electron"
import React, { FC, useContext, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { DownloadState, SyncResult } from "../../util"
import { NewFilesList, Progress } from "../../modules/download"
import { NewFilesModal } from "./NewFilesModal"
import { LoginContext } from "../LoginContext"
import { SyncProgressWrap } from "../components/SyncProgressWrap"

/**
 * This component is the view inside of which the progress of the sync progress is displayed.
 *
 * shows different messages depending on the state of the download process, or different errors
 * depending on the sync result. While downloading, shows the progress bars
 */
export const SyncProgress: FC = props => {
  const { connected, isLogged } = useContext(LoginContext)

  const { t } = useTranslation("client", { keyPrefix: "syncProgress" })

  const [progress, setProgress] = useState<Progress>()
  const [downloadState, setDownloadState] = useState<DownloadState>(
    DownloadState.idle
  )
  const [syncResult, setSyncResult] = useState<SyncResult>()

  const [viewingFiles, setViewingFiles] = useState(false)
  const [newFilesList, setNewFilesList] = useState<NewFilesList>()
  const [viewingPrevFiles, setViewingPrevFiles] = useState(false)
  const [prevNewFilesList, setPrevNewFilesList] = useState<NewFilesList>()

  useEffect(() => {
    ipcRenderer
      .invoke("get-previously-synced-items")
      .then((files: NewFilesList) => {
        setPrevNewFilesList(files)
      })

    ipcRenderer.on("progress", (e, progress: Progress) => setProgress(progress))
    ipcRenderer.on("download-state", (e, state: DownloadState) =>
      setDownloadState(state)
    )
    ipcRenderer.on("sync-result", (e, result: SyncResult) =>
      setSyncResult(result)
    )
    ipcRenderer.on("new-files", (e, files: NewFilesList) =>
      setNewFilesList(files)
    )
  }, [])

  let numfiles = 0
  for (const course in newFilesList) {
    numfiles += newFilesList[course].length
  }

  let prevnumfiles = 0
  for (const course in prevNewFilesList) {
    prevnumfiles += prevNewFilesList[course].length
  }

  let elem: JSX.Element

  // switch for handling what to show at different stages of the downloda
  switch (downloadState) {
    case DownloadState.idle:
      if (syncResult !== undefined) {
        // if the download state is idle, only when there is a result to display
        // if there are new files, show how many and the "view files" button
        // otherwise, show an error when the syncresult is not success, or the success msg
        elem = (
          <div className="sync-progress-idle">
            {syncResult === SyncResult.success && numfiles !== 0 ? (
              <div className="new-files">
                <h3>{t("newFiles", { count: numfiles })}</h3>
                <button
                  className="confirm-button"
                  onClick={() => setViewingFiles(true)}
                  disabled={numfiles === 0}
                >
                  {t("viewFiles")}
                </button>
              </div>
            ) : (
              <h3 className={syncResult ? "error" : undefined}>
                {t(`resultMessage.${SyncResult[syncResult]}`)}
              </h3>
            )}
          </div>
        )
        break
      } else if (prevnumfiles) {
        elem = (
          <div className="sync-progress-idle">
            <div className="new-files">
              <h3>{t("prevNewFiles", { count: prevnumfiles })}</h3>
              <button
                className="confirm-button"
                onClick={() => setViewingPrevFiles(true)}
              >
                {t("viewFiles")}
              </button>
            </div>
          </div>
        )
        break
      } else if (!connected) {
        elem = (
          <div className="sync-progress-idle">
            <h3>{t("noConnection")}</h3>
          </div>
        )
        break
      } else if (!isLogged) {
        elem = (
          <div className="sync-progress-idle">
            <h3>{t("noLogin")}</h3>
          </div>
        )
        break
      }
    case DownloadState.downloading:
      if (progress) {
        // if the download state is downloading, only when there is progress to display
        // show the progress bars & info of the download
        elem = <SyncProgressWrap progress={progress} />
        break
      }
    default:
      // in every other cases, just show the correct status message
      elem = (
        <div className="sync-progress-idle">
          <h3>{t(`statusMessage.${DownloadState[downloadState]}`)}</h3>
        </div>
      )
      break
  }

  return (
    <div className="sync-progress section">
      {elem}
      {viewingFiles ? (
        <NewFilesModal
          files={newFilesList}
          onClose={() => setViewingFiles(false)}
        />
      ) : undefined}
      {viewingPrevFiles ? (
        <NewFilesModal
          files={prevNewFilesList}
          onClose={() => setViewingPrevFiles(false)}
        />
      ) : undefined}
    </div>
  )
}
