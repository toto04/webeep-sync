import path from 'path'
import { EventEmitter } from 'events'
import got from 'got'
import { loginManager, TokenStatusCode, } from './login'

export interface Course {
    id: number,
    name: string
}

export interface FileInfo {
    filename: string,
    filepath: string,
    filesize: number,
    fileurl: string,
    timecreated: number,
    timemodified: number,
}

type Contents = {
    id: number,
    name: string,
    modules: {
        id: number,
        name: string,
        contents?: ({
            type: string,
        } & FileInfo)[],
    }[],
}[]

export declare interface MoodleClient {
    on(event: 'disconnected', listener: () => void): this,
    on(event: 'reconnected', listener: () => void): this,
    on(event: 'network_event', listener: (connected: boolean) => void): this,
}
export class MoodleClient extends EventEmitter {
    userid?: number
    connected: boolean = true

    async call(wsfunction: string, data?: { [key: string]: any }): Promise<any> {
        if (!this.connected) return
        if (!loginManager.isLogged) return
        try {

            let res = await got.post('https://webeep.polimi.it/webservice/rest/server.php', {
                form: {
                    wstoken: loginManager.token,
                    wsfunction,
                    moodlewsrestformat: 'json',
                    moodlewssettingfilter: true,
                    moodlewssettinglang: 'it', // TODO: to be changed for multilanguage
                    ...data
                }
            })
            let parsed = JSON.parse(res.body)
            if (parsed.errorcode === 'invalidtoken') {
                let { code } = await loginManager.refreshToken()
                if (code !== TokenStatusCode.success) {
                    let e = new Error('cannot retrieve valid token')
                    console.error(e)
                    throw e
                }

                return await this.call(wsfunction, data)
            } else return parsed

        } catch (e) {

            this.connected = false
            this.emit('disconnected')
            this.emit('network_event', false)

            let tryForNewToken = async () => {
                let { code } = await loginManager.refreshToken()
                if (code === TokenStatusCode.network_error)
                    setTimeout(() => tryForNewToken(), 2000)
                else {
                    this.connected = true
                    this.emit('reconnected')
                    this.emit('network_event', true)
                }
            }
            tryForNewToken()
        }
    }

    async getUserID() {
        let { userid }: { userid: number } = await this.call('core_webservice_get_site_info')
        this.userid = userid
        return userid
    }

    async getCourses(): Promise<Course[]> {
        let userid = this.userid ?? await this.getUserID()
        let courses: any[] = await this.call('core_enrol_get_users_courses', { userid })
        return courses.map(c => {
            let { id, fullname } = c
            let name = fullname
            let m = name.match(/\d+ - (.+) \(.+\)/)
            if (m) name = m[1]
            return { id, name }
        })
    }

    async getFileInfos(courseid: number): Promise<FileInfo[]> {
        let contents: Contents = await this.call('core_course_get_contents', { courseid })
        let files: FileInfo[] = []
        let mat = contents.find(c => c.name === 'Materiali')
        if (!mat) return []
        for (const module of mat.modules) {
            let { name: modulename, contents } = module
            if (!contents) continue
            for (const file of contents) {
                if (file.type === 'file') {
                    let { filename, filepath, filesize, fileurl, timecreated, timemodified } = file
                    filepath = path.join(modulename, filepath)
                    files.push({ filename, filepath, filesize, fileurl, timecreated, timemodified })
                }
            }
        }
        return files
    }
}