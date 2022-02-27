import path from 'path'
import fs from 'fs/promises'
import { EventEmitter } from 'events'
import got, { CancelableRequest, Response } from 'got'

import { createLogger } from './logger'
import { FileInfo, moodleClient } from './moodle'
import { storeIsReady, store } from './store'
import { loginManager } from './login'

import { DownloadState, SyncResult } from '../util'

let { log, error, debug } = createLogger('DownloadManager')

export interface SingleProgress {
    filename: string
    absolutePath: string
    fileDownloaded: number
    fileTotal: number
}

export type Progress = SingleProgress & {
    downloaded: number
    total: number
}

export type NewFilesList = {
    [course: string]: {
        filename: string,
        absolutePath: string,
        filesize: number,
        updated: boolean
    }[]
}

// just use this error to encapsulate all errors that can happen while writing a file to disk
class FSError extends Error {
    constructor() {
        super()
        this.name = 'FSError'
    }
}

export declare interface DownloadManager {
    on(event: 'sync', listener: () => void): this
    on(event: 'stop', listener: (result: SyncResult) => void): this
    on(event: 'state', listener: (state: DownloadState) => void): this
    on(event: 'new-files', listener: (files: NewFilesList) => void): this
}

export class DownloadManager extends EventEmitter {
    private stopped: boolean = false
    syncing: boolean = false

    private total = 0           // total to be downloaded
    private totalUntilNow = 0   // size of all completed downloads

    currentDownloads: {
        request: CancelableRequest<Response<string>>
        progress: SingleProgress
    }[] = []

    currentState: DownloadState = DownloadState.idle

    constructor() {
        super()
        storeIsReady().then(() => {
            setTimeout(() => {
                let autosync = () => {
                    if (!store.data.settings.autosyncEnabled) return
                    let dt = Date.now() - (store.data.persistence.lastSynced ?? 0)
                    if (dt > store.data.settings.autosyncInterval && !this.syncing) {
                        log('Scheduled autosync beginning!')
                        this.sync()
                    }
                }
                setInterval(() => autosync(), 60000) // try autosync every minute
                autosync()
            }, 60000 - Date.now() % 60000) // align the timer with the tick of the minute
        })
    }

    /**
     * internally updates the state and emits a state event used by the app to track sync progress
     * @param newState the new state
     */
    private updateState(newState: DownloadState) {
        this.emit('state', newState)
        debug('new state: ' + DownloadState[newState])
        this.currentState = newState
    }

    private cancelAllRequests() {
        for (const download of this.currentDownloads) download.request.cancel()
    }

    /**
     * stops the sync, should be called externally (i.e, with the click on the "stop" button in the 
     * frontend) to cancel all current requests end terminate syncing.
     * 
     * This function does not directly emit the "stopped" {@link SyncResult}, as the correct status 
     * will be returned by the {@link sync} function (the stopped state will bubble as the next TODO)
     */
    async stop() {
        if (!this.stopped) {
            this.stopped = true
            this.cancelAllRequests()
        }
    }

    /**
     * The "Sync" in WeBeep Sync. Starts the syncing progress, and takes care of a bunch of side
     * effects.
     * 
     * When called, if no sync is already in progress, sets {@link syncing} to true, emits the 'sync'
     * event and starts the download process, then writes the last synced time to store, updates the
     * {@link currentState} and emits the 'stop' event with the correct {@link SyncResult}
     * @returns A promise wich resolves to true if the sync was succesful, false if it is
     * interrupted for whatever reason (subscirbe to the 'stop' event to get the sync result)
     */
    async sync(): Promise<boolean> {
        if (this.syncing) return false
        log('started syncing')
        this.syncing = true
        this.emit('sync')

        let result = await this._sync()
        log(`finished syncing with result:  ${SyncResult[result]}`)

        if (result === SyncResult.success) {
            store.data.persistence.lastSynced = Date.now()
            store.write()
        }
        this.syncing = false
        this.updateState(DownloadState.idle)
        this.emit('stop', result)
        return result === SyncResult.success
    }

    /**
     * This function is a bit of a mess. Downloads each file, maintaining a cue with each concurrent
     * download. Catches errors that can occurr while downloading the file and returns a sync result
     * based on that.
     * @returns A promise that resolves to the {@link SyncResult} relative to what happened in the sync
     */
    private async _sync(): Promise<SyncResult> {
        await storeIsReady()    // just to be sure that the settings are initialized
        let { downloadPath } = store.data.settings
        this.stopped = false
        try {
            let files = await this.getFilesToDownload()

            this.updateState(DownloadState.downloading)
            let newFilesList: NewFilesList = {}
            this.currentDownloads = []
            this.total = files.reduce((tot, f) => tot + f.filesize, 0)
            this.totalUntilNow = 0

            // this function gets called recursively each time to download a new file
            let pushNewRequest = async () => {
                if (this.stopped) return
                const file = files.pop()    // pop a file from the list, 

                const fullpath = path.join(file.filepath, file.filename)
                const absolutePath = path.join(downloadPath, fullpath)

                // make the request to get the file
                const request = got.get(file.fileurl, {
                    searchParams: {
                        token: loginManager.token, // for some god forsaken reason it's token and not wstoken
                    }
                })

                // prepare the download object, this is what will be pushed in the current downloads
                // to keep track of the progress
                const download: typeof this.currentDownloads[number] = {
                    request,
                    progress: {
                        absolutePath,
                        filename: file.filename,
                        fileDownloaded: 0,
                        fileTotal: file.filesize,
                    }
                }
                this.currentDownloads.push(download)

                request.on('downloadProgress', ({ transferred }) => {
                    // update the download object on each chunk
                    download.progress.fileDownloaded = transferred
                })

                let res = await request

                try {
                    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
                    await fs.writeFile(absolutePath, res.rawBody)
                    await fs.utimes(absolutePath, new Date(), new Date(file.timemodified * 1000))
                } catch (e) {
                    // yes i know, i catch an error just to throw it, but this way anything that
                    // happens while writing will just be an "FSError" and nothing else, and will be
                    // properly logged (which doesn't need to happen in case of a network error)
                    error('An error occured while writing a file to disk:')
                    error(`Current state: ${DownloadState[this.currentState]}`)
                    error(e)
                    throw new FSError()  // unifies all possible errors to an FSError
                }

                if (!newFilesList[file.coursename]) newFilesList[file.coursename] = []
                newFilesList[file.coursename].push({
                    filename: file.filename,
                    absolutePath,
                    filesize: file.filesize,
                    updated: file.updating ?? false
                })

                this.totalUntilNow += file.filesize
                const idx = this.currentDownloads.indexOf(download)
                if (idx !== -1) this.currentDownloads.splice(idx, 1)
                if (files.length) await pushNewRequest()
            }

            // Push 3 requests to kickstart the download process
            let requests: Promise<void>[] = []  // the current pushed requests
            let maxConcurrentDownloads = 5
            for (let i = 0; i < maxConcurrentDownloads && i < files.length; i++) {
                requests.push(pushNewRequest())
            }

            // await the concurrent requests, each will internally await for the next file once
            // the first is finished downloading, so they will only resolve when all downloads are 
            // completed
            await Promise.all(requests)

            this.emit('new-files', newFilesList)

            if (this.stopped) return SyncResult.stopped
            return SyncResult.success
        } catch (e) {
            // other request chains other than the one which threw the error need to be stopped
            this.cancelAllRequests()
            switch (e.name) {
                case 'CancelError':
                    return SyncResult.stopped

                case 'RequestError':
                case 'HTTPError':
                    return SyncResult.networkError

                case 'FSError':
                    return SyncResult.fsError

                default:
                    error('An unkown error occured on a sync attempt:')
                    error(`Current state: ${DownloadState[this.currentState]}`)
                    error(e)
                    return SyncResult.unknownError
            }
        }
    }

    /**
     * constructs the progress object, calculating how download progress until now
     * @returns The Progress object that needs to be sent to the frontend
     */
    getCurrentProgress(): Progress | null {
        if (!this.currentDownloads.length) return null
        return {
            ...this.currentDownloads[0].progress,
            total: this.total,
            downloaded: this.currentDownloads.reduce(
                (t, d) => t + d.progress.fileDownloaded,
                this.totalUntilNow
            )
        }
    }

    /**
     * Gets all files that need to be downloaded, gets all courses from the moodle API and for each
     * file gets all files. Then checks for each file stats in the filesystem to see if a file has
     * already been synced.
     * @returns A promise that resolves to an array of FileInfos with the files that need to be downloaded
     */
    async getFilesToDownload() {
        this.updateState(DownloadState.fetchingCourses)
        let cs = await moodleClient.getCoursesWithoutCache()

        let filesToDownload: FileInfo[] = []
        let { courses } = store.data.persistence
        let { downloadPath } = store.data.settings

        this.updateState(DownloadState.fetchingFiles)

        for (const c of cs) {
            if (!courses[c.id].shouldSync) continue

            // TODO: check all courses in parallel

            let allfiles = await moodleClient.getFileInfos(c)
            for (const file of allfiles) {
                const fullpath = path.join(file.filepath, file.filename)
                let absolutePath = path.join(downloadPath, fullpath)

                try {
                    let stats = await fs.stat(absolutePath)
                    if (
                        stats.mtime.getTime() / 1000 !== file.timemodified
                        || stats.size !== file.filesize
                    ) {
                        // if the file is there, but does not have the same size and last modified
                        // time as on webeep, download it again
                        file.updating = true
                        filesToDownload.push(file)
                    }
                } catch (e) {
                    // if the stats could not be retrieved, the file should be downloaded
                    filesToDownload.push(file)
                }
            }
        }
        return filesToDownload
    }

    async setAutosync(sync: boolean) {
        await storeIsReady()
        store.data.settings.autosyncEnabled = sync
        store.write()
    }
}
export let downloadManager = new DownloadManager()