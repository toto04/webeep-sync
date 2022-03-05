import path from 'path'
import fs from 'fs/promises'
import { nativeTheme } from 'electron'
import { EventEmitter } from 'events'
import { app } from 'electron'
import { Low, JSONFile } from 'lowdb'

import { createLogger } from './logger'
const { debug, log } = createLogger('Store')

/**
 * store.json manifest version, to be increased when breaking changes are made so that a correct 
 * fixes for the change can be implemented in the {@link updateManifestVersion} function
 */
const CURRENT_MANIFEST_VERSION = 2

/**
 * Check in the Settings page in the app for detailed explanation of what each setting does
 */
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
    notificationOnNewFiles?: boolean
    maxConcurrentDownloads?: number
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
    /**
     * whether or not a notification has already been sent to the user
     */
    notificationsHasBeenSent?: boolean
}

export interface Store {
    manifestVersion?: number
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
    notificationOnNewFiles: true,
    maxConcurrentDownloads: 5,
}

let storePath = path.join(app.getPath('userData'), 'store.json')
export let store = new Low<Store>(new JSONFile(storePath))

let initialized = false
let initializing = false

let storeInitializationEE = new EventEmitter()

/**
 * this function checks (and eventually restores) the correct shape of the store.data object to
 * to ensure correct functionality
 * TODO: do things recursively so that adhoc changes dont have to be implemented by hand
 */
function checkStoreIntegrity() {
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
            if (
                store.data.persistence.courses[id].name === undefined
                || store.data.persistence.courses[id].shouldSync === undefined
            ) {
                store.data.persistence.courses = {}
                break
            }
        }
    }
}

/**
 * this function checks the manifest version, if lower than the {@link CURRENT_MANIFEST_VERSION}
 * then corrections should be made to make sure that everything works after an update
 * @returns 
 */
async function updateManifestVersion() {
    let ver = store.data.manifestVersion ?? 0
    if (ver === CURRENT_MANIFEST_VERSION) return

    // add here checks to mutate from old version
    if (ver < 2) {
        // this fixes leading/trailing whitespaces in folders which causes all sorts of wierd bugs
        for (const id in store.data.persistence.courses) {
            try {
                let trimmed = store.data.persistence.courses[id].name.trim()
                if (trimmed !== store.data.persistence.courses[id].name) {
                    let oldPath = path.resolve(store.data.settings.downloadPath, store.data.persistence.courses[id].name)
                    let newPath = path.resolve(store.data.settings.downloadPath, trimmed)
                    store.data.persistence.courses[id].name = trimmed
                    log(`Trimmed course ${id} folder: ${trimmed}`)
                    await fs.rename(oldPath, newPath)
                }
            } catch (e) { log(`ignoring error while trimming course ${id}`) }
        }
    }

    // once sure that everything is updated, change the manifest version
    store.data.manifestVersion = CURRENT_MANIFEST_VERSION
}

export async function storeIsReady(): Promise<void> {
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
        checkStoreIntegrity()

        // assign default settings if missing
        store.data.settings = Object.assign({}, defaultSettings, store.data.settings)
        await updateManifestVersion()

        await store.write()

        initialized = true
        storeInitializationEE.emit('ready')
        log('Store initialized!')
    })
}
storeIsReady()