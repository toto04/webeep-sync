import { app, BrowserWindow, ipcMain } from 'electron'
import { loginManager } from './login'
import { Course, MoodleClient } from './moodle'
let moodleClient = new MoodleClient()
// This allows TypeScript to pick up the magic constant that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit()
}

const createWindow = (): void => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        height: 600,
        width: 800,
        autoHideMenuBar: true,
        titleBarStyle: 'hidden',
        titleBarOverlay: true,
        minHeight: 400,
        minWidth: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    // and load the index.html of the app.
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY)
    if (!loginManager.ready) loginManager.once('ready', async () => {
        mainWindow.webContents.send('refresh-credentials')
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    app.quit()
})

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

let coursesCache: Course[] = []

ipcMain.on('login', async (e, username: string, password: string) => {
    let success = await loginManager.updateCredentials(username, password)
    e.reply('login-return', success, loginManager.login, loginManager.expiring)
})

ipcMain.on('credentials', e => {
    e.reply('login-return', loginManager.isLogged, loginManager.login, loginManager.expiring)
})

ipcMain.on('logout', async e => {
    await loginManager.logout()
    e.reply('login-return', false)
})

ipcMain.on('courses', async e => {
    try {
        let c = await moodleClient.getCourses()
        coursesCache = c
        e.reply('courses-return', c)
    } catch (e) {
        e.reply('courses-return', coursesCache)
    }
})