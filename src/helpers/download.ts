import path from 'path'
import fs from 'fs'
import { EventEmitter } from 'events'
import got, { CancelableRequest } from 'got'
import { FileInfo, moodleClient } from './moodle'
import { initalizeStore, store } from './store'
import { loginManager } from './login'

export declare interface DownloadManager {
    on(event: 'sync', listener: () => void): this
    on(event: 'stop', listener: () => void): this
}
export class DownloadManager extends EventEmitter {
    private stopped: boolean = false
    currentRequest?: CancelableRequest

    async stop() {
        if (!this.stopped) {
            this.stopped = true
            this.currentRequest?.cancel()
        }
    }

    async sync(): Promise<boolean> {
        console.log('started syncing')
        this.emit('sync')
        let result = await this._sync()
        console.log('finished syncing, res: ' + result)
        this.emit('stop')
        return result
    }

    private async _sync(): Promise<boolean> {
        if (!moodleClient.connected) return false
        await initalizeStore() // just to be sure that the settings are initialized
        let { downloadPath } = store.data.settings
        let files = await this.getFilesToDownload()
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
            try {
                let res = await request
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
            } catch (e) { }
        }
        return true
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