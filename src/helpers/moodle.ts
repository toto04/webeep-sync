import path from 'path'
import { EventEmitter } from 'events'
import got from 'got'
import { loginManager, } from './login'
import { initalizeStore, store } from './store'

export interface Course {
    id: number,
    name: string,
    shouldSync: boolean,
}

export interface FileInfo {
    coursename: string,
    filename: string,
    filepath: string,
    filesize: number,
    fileurl: string,
    timecreated: number,
    timemodified: number,
    updating?: boolean, // set to true if the file is already downloaded, and is being updated
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
    on(event: 'username', listener: (username: string) => void): this,
}
export class MoodleClient extends EventEmitter {
    userid?: number
    username?: string
    connected: boolean = true

    cachedCourses: Course[] = []

    constructor() {
        super()
        loginManager.once('ready', () => {
            if (loginManager.isLogged && this.connected) this.getUserID()
        })
    }

    async call(wsfunction: string, data?: { [key: string]: any }, catchNetworkError: boolean = true): Promise<any> {
        if (catchNetworkError && !this.connected) return
        if (!loginManager.isLogged) return
        try {
            // TODO: test network problems
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
                let logged = await loginManager.createLoginWindow()
                if (logged) return await this.call(wsfunction, data)
            } else return parsed
        } catch (e) {
            delete e.timings
            console.error(e)
            if (catchNetworkError) {
                this.connected = false
                this.emit('disconnected')
                this.emit('network_event', false)

                return await new Promise((resolve, reject) => {
                    let tryConnection = async () => {
                        try {
                            resolve(await this.call(wsfunction, data, false))
                            this.connected = true
                            this.emit('reconnected')
                            this.emit('network_event', true)
                        } catch (e) {
                            setTimeout(() => tryConnection(), 5000)
                        }
                    }
                    tryConnection()
                })
            } else throw e
        }
    }

    async getUserID() {
        let res = await this.call('core_webservice_get_site_info')
        if (!res) throw new Error('Cannot retrieve userID, are you logged in?')
        let { userid, fullname }: { userid: number, fullname: string } = res
        this.username = fullname
        this.emit('username', fullname)
        this.userid = userid
        return userid
    }

    async getCourses(): Promise<Course[]> {
        try {
            let userid = this.userid ?? await this.getUserID()
            await initalizeStore()

            // once the store is initialized fetch and parse the courses
            let courses: any[] = await this.call('core_enrol_get_users_courses', { userid }, false)
            let c: Course[] = courses.map(c => {
                let { id, fullname } = c
                let name = fullname
                let m = name.match(/\d+ - (.+) \(.+\)/)
                if (m) name = m[1]
                return { id, name, shouldSync: store.data.settings.syncNewCourses }
            })

            // initialize storage for new courses 
            c.forEach(course => {
                if (!store.data.persistence.courses[course.id]) {
                    let { shouldSync } = course
                    store.data.persistence.courses[course.id] = { shouldSync }
                } else {
                    course.shouldSync = store.data.persistence.courses[course.id].shouldSync
                }
            })
            store.write()

            this.cachedCourses = c
            return c
        } catch (e) {
            return this.cachedCourses
        }
    }

    async getFileInfos(course: Course): Promise<FileInfo[]> {
        // TODO: course custom folder name
        // This function should throw if the call cannot be made, so that the sync operation can halt
        // when a connection is not avilable
        let contents: Contents = await this.call('core_course_get_contents', { courseid: course.id }, false)
        let files: FileInfo[] = []
        let mat = contents.find(c => c.name === 'Materiali')
        if (!mat) return []
        for (const module of mat.modules) {
            let { name: modulename, contents } = module
            if (!contents) continue
            for (const file of contents) {
                if (file.type === 'file') {
                    let { filename, filepath, filesize, fileurl, timecreated, timemodified } = file
                    filepath = path.join(course.name, modulename, filepath)
                    files.push({
                        coursename: course.name,
                        filename,
                        filepath,
                        filesize,
                        fileurl,
                        timecreated,
                        timemodified
                    })
                }
            }
        }
        return files
    }
}
export let moodleClient = new MoodleClient()