import { app, powerSaveBlocker, nativeTheme, BrowserWindow } from "electron"
import { DownloadState } from "./util"
import { createLogger } from "./modules/logger"
import { loginManager } from "./modules/login"
import { moodleClient } from "./modules/moodle"
import { storeIsReady, store } from "./modules/store"
import { downloadManager } from "./modules/download"
import { createWindow, send, focus } from "./modules/window"
import { setupTray, updateTrayContext } from "./modules/tray"
import { i18nInit, i18n } from "./modules/i18next"

import { setupUpdater, checkForUpdates } from "./modules/updater"
import { setupNotifications } from "./modules/notifications"
import { setupIpc } from "./modules/ipc"
import { windowsLoginSettings, setLoginItem } from "./modules/lifecycle"

const { debug, log } = createLogger("APP")

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit()
}

// exits if another instance is already open
if (!app.requestSingleInstanceLock()) {
  app.exit()
}

// power save blocker id, to prevent suspension mid sync
let psbID: number
downloadManager.on("sync", () => {
  psbID = powerSaveBlocker.start("prevent-app-suspension")
  updateTrayContext()
  send("syncing", true)
})

let sendProgressInterval: NodeJS.Timeout

downloadManager.on("stop", result => {
  if (powerSaveBlocker.isStarted(psbID)) powerSaveBlocker.stop(psbID)
  updateTrayContext()
  clearInterval(sendProgressInterval)
  send("syncing", false)
  send("sync-result", result)
})

downloadManager.on("state", state => {
  if (state === DownloadState.downloading) {
    sendProgressInterval = setInterval(() => {
      const progress = downloadManager.getCurrentProgress()
      if (progress) send("progress", progress)
    }, 20).unref()
  }
  send("download-state", state)
})

loginManager.on("token", async () => {
  send("is-logged", true)
  send("courses", await moodleClient.getCoursesWithoutCache())
})
loginManager.on("logout", () => send("is-logged", false))
moodleClient.on("network_event", conn => send("network_event", conn))
moodleClient.on("username", username => send("username", username))
if (moodleClient.username) send("username", moodleClient.username)
moodleClient.on("courses", async c => send("courses", c))

i18n.on("languageChanged", lng =>
  send("language", {
    lng,
    bundle: i18n.getResourceBundle(lng, "client"),
  }),
)

setupUpdater()
setupNotifications()
setupIpc()

// When another instance gets launched, focuses the main window
app.on("second-instance", () => {
  focus()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", async () => {
  log("App ready!")
  const loginItemSettings = app.getLoginItemSettings(windowsLoginSettings)
  await storeIsReady()

  app.setAppUserModelId("webeep-sync")

  // setup internationalization
  await i18nInit()
  await i18n.changeLanguage(store.data.settings.language)

  // if the app was opened at login, do not show the window, only launch it in the tray
  const trayOnly =
    loginItemSettings.wasOpenedAtLogin || process.argv.includes("--tray-only")
  if (!trayOnly || !store.data.settings.keepOpenInBackground) createWindow()
  else {
    debug("Starting app in tray only")
    app.dock?.hide()
  }

  nativeTheme.themeSource = store.data.settings.nativeThemeSource

  if (
    store.data.settings.keepOpenInBackground &&
    store.data.settings.trayIcon
  ) {
    setupTray()
    await updateTrayContext()
  }

  // handle launch item settings
  const disable = !(
    loginItemSettings.launchItems?.reduce((d, i) => i.enabled && d, true) ??
    true
  )
  if (disable) {
    store.data.settings.openAtLogin = false
    debug(
      "openAtLogin was disabled from Task Manager, settings updated accordingly",
    )
    await store.write()
  }
  await setLoginItem(store.data.settings.openAtLogin)

  // check for updates
  checkForUpdates()
})

// When all windows are closed, on macOS hide the dock, if the user has disabled background, quit
app.on("window-all-closed", async () => {
  app.dock?.hide()
  await storeIsReady()
  if (store.data.settings.keepOpenInBackground === false) {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
