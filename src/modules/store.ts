import path from 'path'
import { nativeTheme } from 'electron'
import { EventEmitter } from 'events'
import { app } from 'electron'
import { Low, JSONFile } from 'lowdb'

import { createLogger } from './logger'
const { debug, log } = createLogger('Store')

export interface Settings {
    syncNewCourses?: boolean
    downloadPath?: string
    autosyncEnabled?: boolean
    autosyncInterval?: number
    nativeThemeSource?: typeof nativeTheme.themeSource
    keepOpenInBackground?: boolean
    trayIcon?: boolean
    openAtLogin?: boolean
    language?: 'it' | 'en'
    checkForUpdates?: boolean
}

export interface Persistence {
    courses: {
        [courseid: number]: {
            name: string
            shouldSync: boolean
        }
    }
    lastSynced?: number
    ignoredUpdates: string[]
}

export interface Store {
    settings: Settings
    persistence: Persistence
}

export const defaultSettings: Required<Settings> = {
    syncNewCourses: true,
    downloadPath: path.join(app.getPath('documents'), '/WeBeep Sync/'),
    autosyncEnabled: true,
    autosyncInterval: 2 * 60 * 60 * 1000,   // 2 hours
    nativeThemeSource: 'system',
    keepOpenInBackground: true,
    trayIcon: true,
    openAtLogin: false,
    language: app.getLocaleCountryCode() === 'IT' ? 'it' : 'en',
    checkForUpdates: true,
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
                ignoredUpdates: [],
            }
        }
        if (!store.data.persistence) {
            store.data.persistence = {
                courses: {},
                ignoredUpdates: [],
            }
        } else {
            if (!store.data.persistence.courses) store.data.persistence.courses = {}
            if (!store.data.persistence.ignoredUpdates) store.data.persistence.ignoredUpdates = []

            for (let id in store.data.persistence.courses) {
                // for retrocompatibility, if the shape is not right reset the whole object
                if (store.data.persistence.courses[id].name === undefined
                    || store.data.persistence.courses[id].shouldSync === undefined
                ) {
                    store.data.persistence.courses = {}
                    break
                }
            }
        }

        store.data.settings = Object.assign({}, defaultSettings, store.data.settings)
        await store.write()

        initialized = true
        storeInitializationEE.emit('ready')
        log('Store initialized!')
    })
}
initializeStore()