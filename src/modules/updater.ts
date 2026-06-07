import { app, autoUpdater, ipcMain } from "electron"
import { createLogger } from "./logger"
import { storeIsReady, store } from "./store"
import { send } from "./window"

const DEV = process.argv.includes("--dev")
let updateAvailable = false

export function isUpdateAvailable() {
  return updateAvailable
}

export function setupUpdater() {
  autoUpdater.setFeedURL({
    url: `https://update.electronjs.org/toto04/webeep-sync/${process.platform}-${process.arch}/${app.getVersion()}`,
  })

  autoUpdater.on("error", err => {
    const { error } = createLogger("UPDATE")
    error("Error while checking for updates")
    error(`Stack: ${err.stack}`)
  })

  autoUpdater.on("checking-for-update", () => {
    const { debug } = createLogger("UPDATE")
    debug("Checking for updates")
  })

  autoUpdater.on("update-not-available", () => {
    const { debug } = createLogger("UPDATE")
    debug("No updates available")
  })

  autoUpdater.on("update-available", () => {
    const { log } = createLogger("UPDATE")
    log("New update available, downloading...")
  })

  autoUpdater.on("update-downloaded", () => {
    const { log } = createLogger("UPDATE")
    log("Update downloaded, will be installed on quit")
    updateAvailable = true
    send("update-available")
  })

  ipcMain.handle("quit-and-install", () => {
    const { log } = createLogger("UPDATE")
    log("Installing update and quitting")
    autoUpdater.quitAndInstall()
  })

  // check for updates every hour
  setInterval(
    () => {
      checkForUpdates()
    },
    60 * 60 * 1000,
  ).unref()
}

export async function checkForUpdates() {
  await storeIsReady()
  if (
    !DEV &&
    process.platform !== "linux" &&
    store.data.settings.automaticUpdates
  ) {
    const { debug } = createLogger("UPDATE")
    debug("checking for updates")
    autoUpdater.checkForUpdates()
  }
}
