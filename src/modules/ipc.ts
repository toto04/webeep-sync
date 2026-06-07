import { ipcMain, BrowserWindow, dialog, nativeTheme, app } from "electron"
import path from "path"
import fs from "fs/promises"
import { createLogger } from "./logger"
import { loginManager } from "./login"
import { moodleClient } from "./moodle"
import { storeIsReady, store } from "./store"
import { downloadManager } from "./download"
import { updateTrayContext, setupTray, tray } from "./tray"
import { i18n } from "./i18next"
import { getSyncedItems, getNotificationToBeOpened } from "./notifications"
import { isUpdateAvailable } from "./updater"
import { setLoginItem } from "./lifecycle"

const { debug, error } = createLogger("APP")

export function setupIpc() {
  ipcMain.handle("window-control", (e, command: string) => {
    const win = BrowserWindow.getFocusedWindow()
    switch (command) {
      case "min":
        win.minimize()
        break
      case "max":
        win.isMaximized() ? win.unmaximize() : win.maximize()
        break
      case "close":
        win.close()
        break
    }
  })

  ipcMain.on("get-context", async e => {
    e.reply("is-logged", loginManager.isLogged)
    e.reply("username", moodleClient.username)
    e.reply("syncing", downloadManager.syncing)
    e.reply("network_event", moodleClient.connected)
    await storeIsReady()
    const lng = store.data.settings.language
    e.reply("language", {
      lng,
      bundle: i18n.getResourceBundle(lng, "client"),
    })
    e.reply("courses", moodleClient.getCourses())

    if (isUpdateAvailable()) e.reply("update-available")
  })

  ipcMain.on("logout", async e => {
    await loginManager.logout()
  })

  ipcMain.on("request-login", async e => {
    await loginManager.createLoginWindow()
  })

  ipcMain.on(
    "set-should-sync",
    async (e, courseid: number, shouldSync: boolean) => {
      await storeIsReady()
      store.data.persistence.courses[courseid].shouldSync = shouldSync
      const cached = moodleClient.cachedCourses.find(c => c.id === courseid)
      if (cached) cached.shouldSync = shouldSync
      await store.write()
    },
  )

  ipcMain.on("set-should-sync-all", async (e, shouldSync: boolean) => {
    await storeIsReady()
    for (const id in store.data.persistence.courses) {
      store.data.persistence.courses[id].shouldSync = shouldSync
    }
    for (const course of moodleClient.cachedCourses) {
      course.shouldSync = shouldSync
    }
    await store.write()
    e.sender.send("courses", moodleClient.cachedCourses)
  })

  ipcMain.on("sync-start", e => downloadManager.sync())
  ipcMain.on("sync-stop", e => downloadManager.stop())

  ipcMain.on("sync-settings", async e => {
    await storeIsReady()
    e.reply("download-path", store.data.settings.downloadPath)
    e.reply("autosync", store.data.settings.autosyncEnabled)
    e.reply("autosync-interval", store.data.settings.autosyncInterval)
  })

  ipcMain.on("select-download-path", async e => {
    const p = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
      title: "select download folder",
    })
    if (!p.canceled) {
      store.data.settings.downloadPath = p.filePaths[0]
      e.reply("download-path", p.filePaths[0])
      await store.write()
    }
  })

  ipcMain.on("set-autosync", async (e, sync: boolean) => {
    await downloadManager.setAutosync(sync)
    e.reply("autosync", sync)
    await updateTrayContext()
  })

  ipcMain.on("set-autosync-interval", async (e, interval: number) => {
    store.data.settings.autosyncInterval = interval
    e.reply("autosync-interval", interval)
    await store.write()
  })

  ipcMain.handle("lastsynced", e => {
    return store.data.persistence.lastSynced
  })

  ipcMain.handle("settings", e => {
    const settingsCopy = { ...store.data.settings }
    delete settingsCopy.autosyncEnabled
    delete settingsCopy.downloadPath
    delete settingsCopy.autosyncInterval
    return settingsCopy
  })

  ipcMain.handle("version", () => app.getVersion())

  ipcMain.handle("set-settings", async (e, newSettings) => {
    store.data.settings = { ...store.data.settings, ...newSettings }

    if (
      isNaN(store.data.settings.maxConcurrentDownloads) ||
      store.data.settings.maxConcurrentDownloads < 1
    )
      store.data.settings.maxConcurrentDownloads = 1

    if (
      (!store.data.settings.keepOpenInBackground ||
        !store.data.settings.trayIcon) &&
      tray !== null
    ) {
      tray.destroy()
    } else if (
      store.data.settings.keepOpenInBackground &&
      store.data.settings.trayIcon &&
      (tray === null || tray.isDestroyed())
    ) {
      setupTray()
      await updateTrayContext()
    }

    if (store.data.settings.language !== i18n.language) {
      const lang = store.data.settings.language
      debug(`language changed to: ${lang}`)
      await i18n.changeLanguage(lang)
      await updateTrayContext()
    }

    await setLoginItem(store.data.settings.openAtLogin)
    await store.write()
  })

  ipcMain.handle("get-native-theme", e => {
    return nativeTheme.themeSource
  })

  ipcMain.on("set-native-theme", async (e, theme) => {
    nativeTheme.themeSource = theme
    store.data.settings.nativeThemeSource = theme
    await store.write()
  })

  ipcMain.on("set-preview-language", async (e, lang: string) => {
    debug(`preview language changed to: ${lang}`)
    await i18n.changeLanguage(lang)
  })

  ipcMain.handle("rename-course", async (e, id: number, newName: string) => {
    let success = true
    try {
      const oldPath = path.resolve(
        store.data.settings.downloadPath,
        store.data.persistence.courses[id].name,
      )
      const newPath = path.resolve(store.data.settings.downloadPath, newName)
      debug(`Renamed course ${id} to ${newName}`)
      await fs.rename(oldPath, newPath)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        success = false
        error(
          `An error occoured while renaming a course folder ${id} to ${newName}, was a file inside it open? err: ${err.code}`,
        )
        error(err)
      }
    } finally {
      if (success) {
        moodleClient.cachedCourses.find(c => c.id === id)!.name = newName
        store.data.persistence.courses[id].name = newName
        await store.write()
        e.sender.send("courses", moodleClient.getCourses())
      }
      return success
    }
  })

  ipcMain.handle("get-previously-synced-items", () => {
    return getSyncedItems()
  })

  ipcMain.handle("get-notifications", async () => {
    if (moodleClient.cachedNotifications.length) {
      moodleClient.getNotifications()
      return moodleClient.cachedNotifications
    } else {
      return await moodleClient.getNotifications()
    }
  })

  ipcMain.handle("notification-to-be-opened", async () => {
    return getNotificationToBeOpened()
  })

  ipcMain.handle("mark-notification-read", async (e, id: number) => {
    await moodleClient.markNotificationAsRead(id)
  })

  ipcMain.handle("mark-all-notifications-read", async () => {
    await moodleClient.markAllNotificationsAsRead()
  })
}
