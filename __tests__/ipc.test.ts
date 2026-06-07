/* eslint-disable @typescript-eslint/no-explicit-any */
import { setupIpc } from "../src/modules/ipc"
import { ipcMain, BrowserWindow, dialog } from "electron"
import { loginManager } from "../src/modules/login"
import { moodleClient } from "../src/modules/moodle"
import { store } from "../src/modules/store"
import { downloadManager } from "../src/modules/download"
import { i18n } from "../src/modules/i18next"
import { tray } from "../src/modules/tray"
import fs from "fs/promises"

jest.mock("electron", () => {
  const handlers: any = {}
  const listeners: any = {}
  return {
    ipcMain: {
      handle: jest.fn((channel, handler) => {
        handlers[channel] = handler
      }),
      on: jest.fn((channel, listener) => {
        listeners[channel] = listener
      }),
      _triggerHandle: (channel: string, event: any, ...args: any[]) => {
        if (handlers[channel]) return handlers[channel](event, ...args)
      },
      _triggerOn: (channel: string, event: any, ...args: any[]) => {
        if (listeners[channel]) listeners[channel](event, ...args)
      },
    },
    BrowserWindow: {
      getFocusedWindow: jest.fn().mockReturnValue({
        minimize: jest.fn(),
        isMaximized: jest.fn().mockReturnValue(false),
        maximize: jest.fn(),
        unmaximize: jest.fn(),
        close: jest.fn(),
      }),
    },
    dialog: {
      showOpenDialog: jest
        .fn()
        .mockResolvedValue({ canceled: false, filePaths: ["/new/path"] }),
    },
    nativeTheme: {
      themeSource: "system",
    },
    app: {
      getVersion: jest.fn().mockReturnValue("1.0.0"),
    },
  }
})

jest.mock("fs/promises", () => ({
  rename: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("../src/modules/logger", () => ({
  createLogger: () => ({ debug: jest.fn(), error: jest.fn() }),
}))

jest.mock("../src/modules/login", () => ({
  loginManager: {
    isLogged: true,
    logout: jest.fn(),
    createLoginWindow: jest.fn(),
  },
}))

jest.mock("../src/modules/moodle", () => ({
  moodleClient: {
    username: "test",
    connected: true,
    cachedCourses: [
      { id: 1, name: "Course 1", shouldSync: true },
      { id: 2, name: "Course 2", shouldSync: false },
    ],
    cachedNotifications: [],
    getCourses: jest.fn().mockReturnValue([]),
    getNotifications: jest.fn().mockResolvedValue([]),
    markNotificationAsRead: jest.fn(),
    markAllNotificationsAsRead: jest.fn(),
  },
}))

jest.mock("../src/modules/store", () => ({
  store: {
    data: {
      settings: {
        language: "en",
        downloadPath: "/downloads",
        autosyncEnabled: true,
        autosyncInterval: 60,
        maxConcurrentDownloads: 5,
        keepOpenInBackground: true,
        trayIcon: true,
        openAtLogin: true,
        nativeThemeSource: "system",
      },
      persistence: {
        lastSynced: 123456,
        courses: {
          1: { name: "Course 1", shouldSync: true },
          2: { name: "Course 2", shouldSync: false },
        },
      },
    },
    write: jest.fn().mockResolvedValue(undefined),
  },
  storeIsReady: jest.fn().mockResolvedValue(true),
}))

jest.mock("../src/modules/download", () => ({
  downloadManager: {
    syncing: false,
    sync: jest.fn(),
    stop: jest.fn(),
    setAutosync: jest.fn(),
  },
}))

jest.mock("../src/modules/tray", () => ({
  tray: {
    destroy: jest.fn(),
    isDestroyed: jest.fn().mockReturnValue(false),
  },
  setupTray: jest.fn(),
  updateTrayContext: jest.fn(),
}))

jest.mock("../src/modules/i18next", () => ({
  i18n: {
    language: "en",
    getResourceBundle: jest.fn().mockReturnValue({}),
    changeLanguage: jest.fn(),
  },
}))

jest.mock("../src/modules/notifications", () => ({
  getSyncedItems: jest.fn().mockReturnValue([]),
  getNotificationToBeOpened: jest.fn().mockReturnValue(null),
}))

jest.mock("../src/modules/updater", () => ({
  isUpdateAvailable: jest.fn().mockReturnValue(true),
}))

jest.mock("../src/modules/lifecycle", () => ({
  setLoginItem: jest.fn(),
}))

describe("ipc module", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupIpc()
  })

  const triggerHandle = (channel: string, ...args: any[]) =>
    (ipcMain as any)._triggerHandle(
      channel,
      { sender: { send: jest.fn() } },
      ...args,
    )
  const triggerOn = (channel: string, replyMock?: any, ...args: any[]) =>
    (ipcMain as any)._triggerOn(
      channel,
      { reply: replyMock, sender: { send: replyMock } },
      ...args,
    )

  it("should handle window-control", () => {
    const win = BrowserWindow.getFocusedWindow()
    triggerHandle("window-control", "min")
    expect(win.minimize).toHaveBeenCalled()

    triggerHandle("window-control", "max")
    expect(win.maximize).toHaveBeenCalled()

    triggerHandle("window-control", "close")
    expect(win.close).toHaveBeenCalled()
  })

  it("should handle get-context", async () => {
    const reply = jest.fn()
    await triggerOn("get-context", reply)
    expect(reply).toHaveBeenCalledWith("is-logged", true)
    expect(reply).toHaveBeenCalledWith("username", "test")
    expect(reply).toHaveBeenCalledWith("syncing", false)
    expect(reply).toHaveBeenCalledWith("network_event", true)
    expect(reply).toHaveBeenCalledWith("language", expect.any(Object))
    expect(reply).toHaveBeenCalledWith("courses", expect.any(Array))
    expect(reply).toHaveBeenCalledWith("update-available")
  })

  it("should handle logout and request-login", async () => {
    await triggerOn("logout")
    expect(loginManager.logout).toHaveBeenCalled()

    await triggerOn("request-login")
    expect(loginManager.createLoginWindow).toHaveBeenCalled()
  })

  it("should handle set-should-sync", async () => {
    await triggerOn("set-should-sync", null, 1, false)
    expect(store.data.persistence.courses[1].shouldSync).toBe(false)
    expect(store.write).toHaveBeenCalled()
  })

  it("should handle sync controls", () => {
    triggerOn("sync-start")
    expect(downloadManager.sync).toHaveBeenCalled()

    triggerOn("sync-stop")
    expect(downloadManager.stop).toHaveBeenCalled()
  })

  it("should handle select-download-path", async () => {
    const reply = jest.fn()
    await triggerOn("select-download-path", reply)
    expect(dialog.showOpenDialog).toHaveBeenCalled()
    expect(store.data.settings.downloadPath).toBe("/new/path")
    expect(reply).toHaveBeenCalledWith("download-path", "/new/path")
    expect(store.write).toHaveBeenCalled()
  })

  it("should handle set-settings", async () => {
    await triggerHandle("set-settings", {
      maxConcurrentDownloads: -1,
      language: "it",
      keepOpenInBackground: false,
    })
    expect(store.data.settings.maxConcurrentDownloads).toBe(1)
    expect(tray.destroy).toHaveBeenCalled()
    expect(i18n.changeLanguage).toHaveBeenCalledWith("it")
    expect(store.write).toHaveBeenCalled()
  })

  it("should handle rename-course successfully", async () => {
    const _send = jest.fn()
    const result = await triggerHandle("rename-course", 1, "New Course 1")
    expect(fs.rename).toHaveBeenCalled()
    expect(result).toBe(true)
    expect(moodleClient.cachedCourses[0].name).toBe("New Course 1")
  })

  it("should handle rename-course failure if not ENOENT", async () => {
    ;(fs.rename as jest.Mock).mockRejectedValueOnce({ code: "EACCES" })
    const result = await triggerHandle("rename-course", 1, "Failed Name")
    expect(result).toBe(false)
  })

  it("should handle notification methods", async () => {
    await triggerHandle("mark-notification-read", 123)
    expect(moodleClient.markNotificationAsRead).toHaveBeenCalledWith(123)

    await triggerHandle("mark-all-notifications-read")
    expect(moodleClient.markAllNotificationsAsRead).toHaveBeenCalled()
  })
})
