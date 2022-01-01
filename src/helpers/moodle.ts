import path from 'path'
import { EventEmitter } from 'events'
import got from 'got'
import { createLogger } from './logger'
import { loginManager, } from './login'
import { initializeStore, store } from './store'

const { log, debug } = createLogger('MoodleClient')

export interface Course {
    id: number,
    fullname: string,
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
    on(event: 'courses', listener: (courses: Course[]) => void): this,
}
export class MoodleClient extends EventEmitter {
    userid?: number
    username?: string
    connected: boolean = true

    waitingForCourses = false
    cachedCourses: Course[] = []

    constructor() {
        super()
        loginManager.once('ready', () => {
            if (loginManager.isLogged && this.connected) this.getUserID()
        })
    }

    /**
     * Sets the {@link connected} parameter to the correct value, and emits the correct events
     * @param conn true when connected, false when disconnected
     */
    private setConnected(conn: boolean) {
        if (this.connected !== conn) {
            this.connected = conn
            log(conn ? 'reconneted!' : 'disconnected!')
            this.emit('network_event', conn)
            this.emit(conn ? 'reconnected' : 'disconnected')
        }
    }

    /**
     * This function handles calls to the Moodle Web API
     * @param wsfunction the moodle function [Moodle API Docs](https://docs.moodle.org/dev/Web_service_API_functions)
     * @param data the data to be passed to moodle in the form
     * @param catchNetworkError if false, when a network error occours this function will throw, if 
     * true the call will be retried every 2 seconds until a connection can be established, then the
     * function will resolve normally - default is true
     * @returns 
     */
    async call(
        wsfunction: string,
        data?: { [key: string]: any },
        catchNetworkError: boolean = true,
    ): Promise<any> {
        debug(`API call to function: ${wsfunction}`)
        if (data) debug(`    data: ${JSON.stringify(data)}`)

        if (!loginManager.isLogged) {
            debug('aborting call: logged out')
            return
        }
        try {
            let res = await got.post('https://webeep.polimi.it/webservice/rest/server.php', {
                timeout: { request: 10000 },
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
                debug('Invalid token, requesting new token')
                let logged = await loginManager.createLoginWindow()
                if (logged) return await this.call(wsfunction, data, catchNetworkError)
            } else {
                this.setConnected(true)
                debug('API call success')
                return parsed
            }
        } catch (e) {
            delete e.timings    // useless info to log
            debug(`Network error, catching: ${catchNetworkError}`)
            debug(e)
            this.setConnected(false)
            if (catchNetworkError) {
                return await new Promise((resolve, reject) => {
                    let tryConnection = async () => {
                        try {
                            debug('retring API call...')
                            resolve(await this.call(wsfunction, data, false))
                            debug('retry successful')
                        } catch (e) {
                            setTimeout(() => tryConnection(), 2000)
                        }
                    }
                    tryConnection()
                })
            } else throw e
        }
    }

    /**
     * Get the user id, needed to retrieve the enrolled courses, also retrieves the user's full name
     * @returns the user id
     */
    async getUserID() {
        let res = await this.call('core_webservice_get_site_info')
        if (!res) throw new Error('Cannot retrieve userID, are you logged in?')
        let { userid, fullname }: { userid: number, fullname: string } = res
        this.username = fullname
        this.emit('username', fullname)
        this.userid = userid
        return userid
    }

    /**
     * Retrieves the user's enrolled courses, should be called when it's critical to retrieve
     * the correct courses (e.g while searching for new files while syncing), in other cases (e.g 
     * when displaying courses in the UI) use {@link getCourses}
     * @param catchNetworkError if set to true, doesn't throw on fail, instead keeps retrying until
     * it succeedes
     * @returns A promise which resolves with the list of the enrolled courses
     */
    async getCoursesWithoutCache(catchNetworkError: boolean = false): Promise<Course[]> {
        let userid = this.userid ?? await this.getUserID()
        await initializeStore()

        // once the store is initialized fetch and parse the courses
        let courses: any[] = await this.call('core_enrol_get_users_courses', { userid }, catchNetworkError)
        let c: Course[] = courses.map(c => {
            let { id, fullname } = c
            let name = fullname
            let m = name.match(/\d+ - (.+) \(.+\)/)
            if (m) name = m[1]
            return {
                id,
                fullname,
                name,
                shouldSync: store.data.settings.syncNewCourses
            }
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

        this.emit('courses', c)
        this.cachedCourses = c
        return c
    }

    /**
     * Get the user's enrolled courses. If the API call cannot be established, this function returns
     * previously cached courses, then when tha call finally resolves, the updated courses will be
     * passed to the 'courses' event. Should be used only when it's not necessary for the courses to
     * be absolutely correct, in that case {@link getCoursesWithoutCache} should be used 
     * @returns A promise which resolves with the list of the enrolled courses
     */
    getCourses(): Course[] {
        if (!this.waitingForCourses) {
            // if not already waiting for the api resposne, make the call and retrieve updated courses
            this.waitingForCourses = true
            this.getCoursesWithoutCache(true).then(() => { this.waitingForCourses = false })
        }
        return this.cachedCourses
    }

    async getFileInfos(course: Course): Promise<FileInfo[]> {
        // TODO: course custom folder name
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
                    // TODO: find a better way to handle illegal characters
                    filepath = filepath.replace(/[:*?"<>|]/g, '_')
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