import path from 'path'
import fs from 'fs/promises'
import {
    app,
    autoUpdater,
    BrowserWindow,
    dialog,
    ipcMain,
    nativeTheme,
    Notification,
    powerSaveBlocker,
} from 'electron'

import { DownloadState } from './util'

import { createLogger } from './modules/logger'
import { loginManager } from './modules/login'
import { moodleClient, MoodleNotification } from './modules/moodle'
import { storeIsReady, store, } from './modules/store'
import { downloadManager, NewFilesList } from './modules/download'
import { createWindow, send, focus } from './modules/window'
import { setupTray, updateTrayContext, tray } from './modules/tray'

import { i18nInit, i18n } from './modules/i18next'

const { debug, log, error } = createLogger('APP')

const DEV = process.argv.includes('--dev')

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit()
}

// exits if another instance is already open
if (!app.requestSingleInstanceLock()) {
    app.exit()
}

// power save blocker id, to prevent suspension mid sync
let psbID: number
downloadManager.on('sync', () => {
    psbID = powerSaveBlocker.start('prevent-app-suspension')
    updateTrayContext()
})
downloadManager.on('stop', () => {
    if (powerSaveBlocker.isStarted(psbID)) powerSaveBlocker.stop(psbID)
    updateTrayContext()
})

const windowsLoginSettings = {
    path: path.resolve(path.dirname(process.execPath), '../Update.exe'),
    args: [
        "--processStart", `"${path.basename(process.execPath)}"`,
        "--process-start-args", `"--hidden --tray-only"`,
    ]
}

/**
 * Sets the login item for launching the app at login
 * 
 * If the --dev arg is passed to electron, it's a no-op (allows for development without setting
 * electron as a launch item)
 * @param openAtLogin whether the app should launch at login or not
 */
async function setLoginItem(openAtLogin: boolean) {
    if (DEV) return
    if (process.platform === 'linux') return

    await app.whenReady()
    debug(`Setting openAtLogin to ${openAtLogin}`)
    app.setLoginItemSettings({
        openAtLogin,
        openAsHidden: true,
        ...windowsLoginSettings
    })
}


loginManager.on('token', async () => {
    send('is-logged', true)
    send('courses', await moodleClient.getCoursesWithoutCache())
})
loginManager.on('logout', () => send('is-logged', false))
moodleClient.on('network_event', conn => send('network_event', conn))
moodleClient.on('username', username => send('username', username))
if (moodleClient.username) send('username', moodleClient.username)

let sendProgressInterval: NodeJS.Timer

downloadManager.on('sync', () => send('syncing', true))
downloadManager.on('stop', result => {
    clearInterval(sendProgressInterval)
    send('syncing', false)
    send('sync-result', result)
})
downloadManager.on('state', state => {
    if (state === DownloadState.downloading) {
        sendProgressInterval = setInterval(() => {
            const progress = downloadManager.getCurrentProgress()
            if (progress) send('progress', progress)
        }, 20)
    }
    send('download-state', state)
})

/**
 * global variable storing new files downloaded in background to show once the main window opens
 */
let syncedItems: NewFilesList = {}

/**
 * Prepare a new notification with a different body based on the number of files
 * downloaded and the number of courses from which files were downloaded, then show it
 * @param numfiles the number of new files downloaded in background
 */
async function showNewFilesNotification(numfiles: number) {
    await storeIsReady()
    const t = i18n.getFixedT(null, 'notifications', 'newFiles')

    const courses = Object.keys(syncedItems)
    let body = t('body.default')

    if (!store.data.persistence.notificationsHasBeenSent) {
        body = t('body.firstNotification')
        store.data.persistence.notificationsHasBeenSent = true
        store.write()
    } else if (numfiles === 1) {
        const coursename = courses[0]
        const file = syncedItems[coursename][0]
        body = t('body.singleFile', { filename: file.filename, coursename })
    } else {
        if (courses.length === 1)
            body = t('body.singleCourse', { coursename: courses[0] })
        else
            body = t('body.multipleCourses', { count: courses.length })
    }

    const notification = new Notification({
        title: t('notificationTitle', { count: numfiles }),
        body,
    })
    notification.on('click', () => focus())
    notification.show()
}

/**
 * Prepare a new notification showing the moodle message title
 * @param moodleNotif the moodle notification
 */
async function showMessageNotification(moodleNotif: MoodleNotification) {
    await storeIsReady()
    const t = i18n.getFixedT(null, 'notifications', 'newMessage')

    const notification = new Notification({
        title: t('notificationTitle'),
        body: moodleNotif.title,
    })
    notification.on('click', async () => {
        notificationToBeOpened = moodleNotif.id
        await focus()
    })
    notification.show()
}

downloadManager.on('new-files', files => {
    const sent = send('new-files', files)

    if (!sent) {
        // the window is closed, store all new files in the syncedItems object (and send notification)
        let numfiles = 0
        for (const course in files) {
            numfiles += files[course].length
            // update the syncedItems object to contain all new synced items
            if (!syncedItems[course]) syncedItems[course] = []
            syncedItems[course].push(...files[course])
        }

        // if there are new files, notifications are on and are supported, send a new notification
        if (numfiles
            && store.data.settings.keepOpenInBackground     // be sure app can be open in background
            && store.data.settings.notificationOnNewFiles   // ^ not sure if this can occur but better safe then sorry
            && Notification.isSupported()) {
            showNewFilesNotification(numfiles)
        }
    }
})

moodleClient.on('courses', async c => send('courses', c))
let notificationToBeOpened: number | null = null
moodleClient.on('notifications', async notifications => {
    send('notifications', notifications)

    // delete old notifications from the store if they are not in the notifications array
    Object.entries(store.data.persistence.sentMessageNotifications)
        .forEach(([id, { sentTimestamp }]) => {
            if ((sentTimestamp < Date.now() - 1000 * 60 * 60 * 24 * 7)
                && !notifications.find(n => n.id === parseInt(id)))
                delete store.data.persistence.sentMessageNotifications[id]
        })

    // filter the new notifications
    await storeIsReady()
    const newNotifications = notifications
        .filter(n => !n.read)
        .filter(n => !store.data.persistence.sentMessageNotifications[n.id])

    // save the new notifications as sent
    newNotifications.forEach(n => store.data.persistence.sentMessageNotifications[n.id] = {
        sentTimestamp: Date.now()
    })
    store.write()

    // send a push notification for each new notification
    if (store.data.settings.keepOpenInBackground
        && store.data.settings.notificationOnMessage
        && Notification.isSupported()) {
        newNotifications.forEach(n => showMessageNotification(n))
    }
})

i18n.on('languageChanged', lng => send('language', {
    lng,
    bundle: i18n.getResourceBundle(lng, 'client')
}))


let updateAvailable = false

autoUpdater.setFeedURL({
    url: `https://update.electronjs.org/toto04/webeep-sync/${process.platform}-${process.arch}/${app.getVersion()}`,
})

async function checkForUpdates() {
    await storeIsReady()
    if (!DEV
        && process.platform !== 'linux'
        && store.data.settings.automaticUpdates
    ) {
        const { debug } = createLogger('UPDATE')
        debug('checking for updates')
        autoUpdater.checkForUpdates()
    }
}

// check for updates every hour
setInterval(() => {
    checkForUpdates()
}, 60 * 60 * 1000)

autoUpdater.on('error', (err) => {
    const { error } = createLogger('UPDATE')
    error('Error while checking for updates')
    error(`Stack: ${err.stack}`)
})

autoUpdater.on('checking-for-update', () => {
    const { debug } = createLogger('UPDATE')
    debug('Checking for updates')
})

autoUpdater.on('update-not-available', () => {
    const { debug } = createLogger('UPDATE')
    debug('No updates available')
})

autoUpdater.on('update-available', () => {
    const { log } = createLogger('UPDATE')
    log('New update available, downloading...')
})

autoUpdater.on('update-downloaded', () => {
    const { log } = createLogger('UPDATE')
    log('Update downloaded, will be installed on quit')
    updateAvailable = true
    send('update-available')
})

ipcMain.handle('quit-and-install', () => {
    const { log } = createLogger('UPDATE')
    log('Installing update and quitting')
    autoUpdater.quitAndInstall()
})

// When another instance gets launched, focuses the main window
app.on('second-instance', () => {
    focus()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
    log('App ready!')
    const loginItemSettings = app.getLoginItemSettings(windowsLoginSettings)
    await storeIsReady()

    app.setAppUserModelId('webeep-sync')    // windows wants this thing

    // setup internationalization
    await i18nInit()
    await i18n.changeLanguage(store.data.settings.language)

    // if the app was opened at login, do not show the window, only launch it in the tray
    const trayOnly = loginItemSettings.wasOpenedAtLogin || process.argv.includes('--tray-only')
    if (!trayOnly || !store.data.settings.keepOpenInBackground) createWindow()
    else {
        debug('Starting app in tray only')
        app.dock?.hide()
    }

    nativeTheme.themeSource = store.data.settings.nativeThemeSource

    if (store.data.settings.keepOpenInBackground && store.data.settings.trayIcon) {
        setupTray()
        await updateTrayContext()
    }

    // handle launch item settings 
    // disabled is true only if there's a launch item present and it is set to false
    const disable = !(loginItemSettings.launchItems?.reduce((d, i) => i.enabled && d, true) ?? true)
    // if a launch item is already present but the user has disabled it from task manager,
    // settings.openAtLogin should be set to false
    if (disable) {
        store.data.settings.openAtLogin = false
        debug('openAtLogin was disabled from Task Manager, settings updated accordingly')
        await store.write()
    }
    await setLoginItem(store.data.settings.openAtLogin)

    // check for updates
    checkForUpdates()
})

// When all windows are closed, on macOS hide the dock, if the user has disabled background, quit
app.on('window-all-closed', async () => {
    app.dock?.hide()
    await storeIsReady()
    if (store.data.settings.keepOpenInBackground === false) {
        app.quit()
    }
})

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

// --- IPC COMUNICATION HANDLES ---

ipcMain.handle('window-control', (e, command: string) => {
    const win = BrowserWindow.getFocusedWindow()
    switch (command) {
        case 'min':
            win.minimize()
            break
        case 'max':
            win.isMaximized() ? win.unmaximize() : win.maximize()
            break
        case 'close':
            win.close()
            break
    }
})

// a catch all event to send everything needed right when the frontend loads
ipcMain.on('get-context', async e => {
    e.reply('is-logged', loginManager.isLogged)
    e.reply('username', moodleClient.username)
    e.reply('syncing', downloadManager.syncing)
    e.reply('network_event', moodleClient.connected)
    await storeIsReady()
    const lng = store.data.settings.language
    e.reply('language', {
        lng,
        bundle: i18n.getResourceBundle(lng, 'client')
    })
    e.reply('courses', moodleClient.getCourses())

    if (updateAvailable) e.reply('update-available')
})

ipcMain.on('logout', async e => {
    await loginManager.logout()
})

ipcMain.on('request-login', async e => {
    await loginManager.createLoginWindow()
})

ipcMain.on('set-should-sync', async (e, courseid: number, shouldSync: boolean) => {
    await storeIsReady()
    store.data.persistence.courses[courseid].shouldSync = shouldSync
    await store.write()
})

ipcMain.on('sync-start', e => downloadManager.sync())
ipcMain.on('sync-stop', e => downloadManager.stop())

ipcMain.on('sync-settings', async e => {
    await storeIsReady()
    e.reply('download-path', store.data.settings.downloadPath)
    e.reply('autosync', store.data.settings.autosyncEnabled)
    e.reply('autosync-interval', store.data.settings.autosyncInterval)
})

ipcMain.on('select-download-path', async e => {
    const path = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory',],
        title: 'select download folder'
    })
    if (!path.canceled) {
        store.data.settings.downloadPath = path.filePaths[0]
        e.reply('download-path', path.filePaths[0])
        await store.write()
    }
})
ipcMain.on('set-autosync', async (e, sync: boolean) => {
    await downloadManager.setAutosync(sync)
    e.reply('autosync', sync)
    await updateTrayContext()
})

ipcMain.on('set-autosync-interval', async (e, interval: number) => {
    store.data.settings.autosyncInterval = interval
    e.reply('autosync-interval', interval)
    await store.write()
})

ipcMain.handle('lastsynced', e => {
    return store.data.persistence.lastSynced
})

ipcMain.handle('settings', e => {
    const settingsCopy = { ...store.data.settings }
    // this three settings are not managed in the settings menu
    delete settingsCopy.autosyncEnabled
    delete settingsCopy.downloadPath
    delete settingsCopy.autosyncInterval
    return settingsCopy
})

ipcMain.handle('version', () => app.getVersion())

// this event handles the settings update, has side effects
ipcMain.handle('set-settings', async (e, newSettings) => {
    store.data.settings = { ...store.data.settings, ...newSettings }

    // concurrent downloads
    if (isNaN(store.data.settings.maxConcurrentDownloads) || store.data.settings.maxConcurrentDownloads < 1)
        store.data.settings.maxConcurrentDownloads = 1

    // tray 
    if ((
        !store.data.settings.keepOpenInBackground
        || !store.data.settings.trayIcon
    ) && tray !== null) {
        tray.destroy()
    } else if (
        store.data.settings.keepOpenInBackground
        && store.data.settings.trayIcon
        && (tray === null || tray.isDestroyed())
    ) {
        setupTray()
        await updateTrayContext()
    }

    // language
    if (store.data.settings.language !== i18n.language) {
        const lang = store.data.settings.language
        debug(`language changed to: ${lang}`)
        await i18n.changeLanguage(lang)
        await updateTrayContext()   // updates the tray with the new language
    }

    // launch on stratup
    await setLoginItem(store.data.settings.openAtLogin)
    await store.write()
})

ipcMain.handle('get-native-theme', e => {
    return nativeTheme.themeSource
})
ipcMain.on('set-native-theme', async (e, theme) => {
    nativeTheme.themeSource = theme
    store.data.settings.nativeThemeSource = theme
    await store.write()
})

ipcMain.handle('rename-course', async (e, id: number, newName: string) => {
    let success = true
    try {
        // try to rename the folder, if the folder doesn't exist just ignore it
        const oldPath = path.resolve(store.data.settings.downloadPath, store.data.persistence.courses[id].name)
        const newPath = path.resolve(store.data.settings.downloadPath, newName)
        debug(`Renamed course ${id} to ${newName}`)
        await fs.rename(oldPath, newPath)
    } catch (err) {
        // catch the error, if it's ENOENT it just means that the folder doesn't exist, and the error
        // should be ignored, otherwise something happened while renaming the folder
        if (err.code !== 'ENOENT') {
            success = false
            error(`An error occoured while renaming a course folder ${id} to ${newName}, was a file inside it open? err: ${err.code}`)
            error(err)
        }
    } finally {
        if (success) {
            // update the cache for the UI
            moodleClient.cachedCourses.find(c => c.id === id).name = newName
            // update the store
            store.data.persistence.courses[id].name = newName
            await store.write()
            // send new courses information to frontend
            e.sender.send('courses', moodleClient.getCourses())
        }
        return success
    }
})

ipcMain.handle('get-previously-synced-items', () => {
    setImmediate(() => syncedItems = {}) // empty the syncedItems variable only after returning it
    return syncedItems
})

ipcMain.handle('get-notifications', async () => {
    if (moodleClient.cachedNotifications.length) {
        moodleClient.getNotifications() // reload the notficaion cache
        return moodleClient.cachedNotifications
    } else {
        // if there are no cached notifications, get them from the server
        return await moodleClient.getNotifications()
    }
})

ipcMain.handle('notification-to-be-opened', async () => {
    if (notificationToBeOpened) {
        setImmediate(() => {
            // reset the notification to be opened
            notificationToBeOpened = null
        })
        return notificationToBeOpened
    }
})

ipcMain.handle('mark-notification-read', async (e, id: number) => {
    await moodleClient.markNotificationAsRead(id)
})