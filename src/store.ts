import path from 'path'
import { app, session } from 'electron'
import { Low, JSONFile } from 'lowdb'

export interface Settings {
    syncNewCourses?: boolean
}

export interface CourseState {
    [courseid: number]: {
        shouldSync: boolean
        // lastSynced?: number
        syncedFiles: {
            [filepath: string]: {
                filesize: number
                timecreated: number
                timemodified: number
            }
        }
    }
}

export interface Store {
    settings: Settings
    courseState: CourseState
}

export const defaultSettings: Required<Settings> = {
    syncNewCourses: true
}

let storePath = path.join(app.getPath('userData'), 'store.json')
export let store = new Low<Store>(new JSONFile(storePath))

let initialized = false

export async function initalizeStore() {
    if (!initialized) {
        await store.read()
        if (!store.data.settings) store.data.settings = {}
        if (!store.data.courseState) store.data.courseState = {}
        let setting: keyof Settings
        for (setting in defaultSettings) {
            if (store.data.settings[setting] === undefined)
                store.data.settings[setting] = defaultSettings[setting]
        }
        await store.write()
        initialized = true
    }
}
initalizeStore()