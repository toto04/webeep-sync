import path from 'path'
import fs from 'fs/promises'
import { EventEmitter } from 'events'
import got, { CancelableRequest } from 'got'
import { FileInfo, moodleClient } from './moodle'
import { initalizeStore, store } from './store'
import { loginManager } from './login'

import { DownloadState, SyncResult } from '../util'

export interface Progress {
    downloaded: number
    total: number
    fileName: string
    fileDownloaded: number
    fileTotal: number
}

export type NewFilesList = {
    [course: string]: {
        filename: string,
        absolutePath: string,
        filesize: number,
        updated: boolean
    }[]
}

export declare interface DownloadManager {
    on(event: 'sync', listener: () => void): this
    on(event: 'stop', listener: (result: SyncResult) => void): this
    on(event: 'progress', listener: (progress: Progress) => void): this
    on(event: 'state', listener: (state: DownloadState) => void): this
    on(event: 'new-files', listener: (files: NewFilesList) => void): this
}

export class DownloadManager extends EventEmitter {
    private stopped: boolean = false
    syncing: boolean = false
    currentRequest?: CancelableRequest
    currentState: DownloadState = DownloadState.idle

    constructor() {
        super()
        initalizeStore().then(() => {
            setTimeout(() => {
                let autosync = () => {
                    if (!store.data.settings.autosyncEnabled) return
                    let dt = Date.now() - (store.data.persistence.lastSynced ?? 0)
                    if (dt > store.data.settings.autosyncInterval && !this.syncing)
                        this.sync()
                }
                setInterval(() => autosync(), 60000) // try autosync every minute
                autosync()
            }, 60000 - Date.now() % 60000) // align the timer with the tick of the minute
        })
    }

    private updateState(newState: DownloadState) {
        this.emit('state', newState)
        console.log('the state was updated! ' + DownloadState[newState])
        this.currentState = newState
    }

    async stop() {
        if (!this.stopped) {
            this.stopped = true
            this.currentRequest?.cancel()
        }
    }

    async sync(): Promise<boolean> {
        if (this.syncing) return false
        console.log('started syncing')
        this.syncing = true
        this.emit('sync')

        let result = await this._sync()
        console.log('finished syncing, res: ' + SyncResult[result])

        if (result === SyncResult.success) {
            store.data.persistence.lastSynced = Date.now()
            store.write()
        }
        this.syncing = false
        this.updateState(DownloadState.idle)
        this.emit('stop', result)
        return result === SyncResult.success
    }

    private async _sync(): Promise<SyncResult> {
        if (!moodleClient.connected) return SyncResult.networkError
        await initalizeStore() // just to be sure that the settings are initialized
        let { downloadPath } = store.data.settings
        this.stopped = false
        try {
            let files = await this.getFilesToDownload()

            this.updateState(DownloadState.downloading)

            let newFilesList: NewFilesList = {}

            const total = files.reduce((tot, f) => tot + f.filesize, 0)
            let totalUntilNow = 0

            for (const file of files) {
                if (this.stopped) {
                    this.stopped = false
                    return SyncResult.stopped
                }
                let request = got.get(file.fileurl, {
                    searchParams: {
                        token: loginManager.token, // for some god forsaken reason it's token and not wstoken
                    }
                })

                let fullpath = path.join(file.filepath, file.filename)
                let absolutePath = path.join(downloadPath, fullpath)

                this.currentRequest = request
                request.on('downloadProgress', ({ transferred }) => {
                    this.emit('progress', {
                        fileName: fullpath,
                        downloaded: totalUntilNow + transferred,
                        total,
                        fileDownloaded: transferred,
                        fileTotal: file.filesize
                    })
                })

                let res = await request

                totalUntilNow += file.filesize

                try {
                    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
                    await fs.writeFile(absolutePath, res.rawBody)
                    await fs.utimes(absolutePath, new Date(), new Date(file.timemodified * 1000))

                    if (!newFilesList[file.coursename]) newFilesList[file.coursename] = []
                    newFilesList[file.coursename].push({
                        filename: file.filename,
                        absolutePath,
                        filesize: file.filesize,
                        updated: file.updating ?? false
                    })
                } catch (e) {
                    console.error('An error occured while writing a file to disk:')
                    console.error(e)
                    return SyncResult.fsError
                }
            }
            this.emit('new-files', newFilesList)
            return SyncResult.success
        } catch (e) {
            switch (e.name) {
                case 'CancelError':
                    return SyncResult.stopped

                case 'RequestError':
                    return SyncResult.networkError

                default:
                    console.error('An unkown error occured on a sync attempt:')
                    console.error(e)
                    return SyncResult.unknownError
            }
        }
    }

    async getFilesToDownload() {
        this.updateState(DownloadState.fetchingCourses)
        let cs = await moodleClient.getCourses()

        let filesToDownload: FileInfo[] = []
        let { courses } = store.data.persistence
        let { downloadPath } = store.data.settings

        this.updateState(DownloadState.fetchingFiles)

        for (const c of cs) {
            if (!courses[c.id].shouldSync) continue

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
        await initalizeStore()
        store.data.settings.autosyncEnabled = sync
        store.write()
    }
}
export let downloadManager = new DownloadManager()