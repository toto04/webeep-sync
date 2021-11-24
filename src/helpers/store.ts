import path from 'path'
import { nativeTheme } from 'electron'
import { EventEmitter } from 'events'
import { app } from 'electron'
import { Low, JSONFile } from 'lowdb'

export interface Settings {
    syncNewCourses?: boolean
    downloadPath?: string
    autosyncEnabled?: boolean
    autosyncInterval?: number
    nativeThemeSource?: typeof nativeTheme.themeSource
    keepOpenInBackground?: boolean
    trayIcon?: boolean
}

export interface Persistence {
    courses: {
        [courseid: number]: {
            shouldSync: boolean
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
    downloadPath: path.join(app.getPath('documents'), '/WeBeep Sync/'),
    autosyncEnabled: false,
    autosyncInterval: 2 * 60 * 60 * 1000,
    nativeThemeSource: 'system',
    keepOpenInBackground: true,
    trayIcon: true,
}

let storePath = path.join(app.getPath('userData'), 'store.json')
export let store = new Low<Store>(new JSONFile(storePath))

let initialized = false
let initializing = false

let storeInitializationEE = new EventEmitter()

export async function initializeStore(): Promise<void> {
    return new Promise(async (resolve, reject) => {
        if (initialized) {
            resolve()
            return
        }
        if (initializing) {
            storeInitializationEE.on('ready', () => resolve())
            return
        }

        initializing = true

        await store.read()
        if (!store.data) store.data = {
            settings: {},
            persistence: {
                courses: {},
            }
        }
        if (!store.data.settings) store.data.settings = {}
        if (!store.data.persistence) {
            store.data.persistence = {
                courses: {},
            }
        } else {
            if (!store.data.persistence.courses) store.data.persistence.courses = {}
        }

        let setting: keyof Settings
        for (setting in defaultSettings) {
            if (store.data.settings[setting] === undefined)
                store.data.settings[setting] = defaultSettings[setting] as never // typescript's a bitch
        }
        await store.write()

        initialized = true
        storeInitializationEE.emit('ready')
    })
}
initializeStore()