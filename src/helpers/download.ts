import path from 'path'
import fs from 'fs'
import { EventEmitter } from 'events'
import got, { CancelableRequest } from 'got'
import { FileInfo, moodleClient } from './moodle'
import { initalizeStore, store } from './store'
import { loginManager } from './login'

export interface Progress {
    downloaded: number
    total: number
    fileName: string
    fileDownloaded: number
    fileTotal: number
}

export declare interface DownloadManager {
    on(event: 'sync', listener: () => void): this
    on(event: 'stop', listener: () => void): this
    on(event: 'progress', listener: (progress: Progress) => void): this
}
export class DownloadManager extends EventEmitter {
    private stopped: boolean = false
    syncing: boolean = false
    currentRequest?: CancelableRequest

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
        console.log('finished syncing, res: ' + result)
        if (result) {
            store.data.persistence.lastSynced = Date.now()
            store.write()
        }
        this.syncing = false
        this.emit('stop')
        return result
    }

    private async _sync(): Promise<boolean> {
        if (!moodleClient.connected) return false
        await initalizeStore() // just to be sure that the settings are initialized
        let { downloadPath } = store.data.settings
        this.stopped = false
        try {
            let files = await this.getFilesToDownload()

            const total = files.reduce((tot, f) => tot + f.filesize, 0)
            let totalUntilNow = 0

            for (const file of files) {
                if (this.stopped) {
                    this.stopped = false
                    return false
                }
                let request = got.get(file.fileurl, {
                    searchParams: {
                        token: loginManager.token, // for some god forsaken reason it's token and not wstoken
                    }
                })

                let fullpath = path.join(file.filepath, file.filename)
                let absolutePath = path.join(downloadPath, fullpath)

                console.log('started download for ' + fullpath)

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

                console.log('finished download for ' + fullpath)
                console.log('writing to absolute path: ' + absolutePath)
                fs.mkdir(path.dirname(absolutePath), { recursive: true }, (err) => {
                    if (err) {
                        this.stop()
                        console.error(err)
                        return
                    }
                    fs.writeFile(absolutePath, res.rawBody, err => {
                        if (err) {
                            this.stop()
                            console.error(err)
                            return
                        }
                        console.log('wrote to disk ' + fullpath)
                        store.data.persistence.syncedFiles[fullpath] = {
                            filesize: file.filesize,
                            timecreated: file.timecreated,
                            timemodified: file.timemodified
                        }
                        store.write()
                    })
                })

            }
            return true
        } catch (e) {
            delete e.timings
            console.error(e)
            return false
        }
    }

    async getFilesToDownload() {
        let cs = await moodleClient.getCourses()
        let filesToDownload: FileInfo[] = []
        let { courses, syncedFiles } = store.data.persistence

        for (const c of cs) {
            if (!courses[c.id].shouldSync) continue

            let allfiles = await moodleClient.getFileInfos(c)
            for (const file of allfiles) {
                const fullpath = path.join(file.filepath, file.filename)
                const storedfilestate = syncedFiles[fullpath]
                if (!storedfilestate
                    || storedfilestate.filesize !== file.filesize
                    || storedfilestate.timemodified !== file.timemodified
                )
                    filesToDownload.push(file)
            }
        }
        return filesToDownload
    }
}
export let downloadManager = new DownloadManager()