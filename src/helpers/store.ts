import path from 'path'
import { app, session } from 'electron'
import { Low, JSONFile } from 'lowdb'

export interface Settings {
    syncNewCourses?: boolean
    downloadPath?: string
}

export interface Persistence {
    courses: {
        [courseid: number]: {
            shouldSync: boolean
        }
    }
    syncedFiles: {
        [filepath: string]: {
            filesize: number
            timecreated: number
            timemodified: number
        }
    }
    lastSynced?: number
}

export interface Store {
    settings: Settings
    persistence: Persistence
}

export const defaultSettings: Required<Settings> = {
    syncNewCourses: true,
    downloadPath: path.join(app.getPath('documents'), '/WeBeep Sync/')
}

let storePath = path.join(app.getPath('userData'), 'store.json')
export let store = new Low<Store>(new JSONFile(storePath))

let initialized = false

export async function initalizeStore() {
    if (!initialized) {
        await store.read()
        if (!store.data.settings) store.data.settings = {}
        if (!store.data.persistence) store.data.persistence = {
            courses: {},
            syncedFiles: {},
        }
        let setting: keyof Settings
        for (setting in defaultSettings) {
            if (store.data.settings[setting] === undefined)
                store.data.settings[setting] = defaultSettings[setting] as never // typescript's a bitch
        }
        await store.write()
        initialized = true
    }
}
initalizeStore()