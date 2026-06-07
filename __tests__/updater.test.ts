/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  setupUpdater,
  checkForUpdates,
  isUpdateAvailable,
} from "../src/modules/updater"
import { autoUpdater, ipcMain } from "electron"
import { storeIsReady } from "../src/modules/store"

jest.mock("electron", () => {
  const listeners: any = {}
  const ipcListeners: any = {}
  return {
    app: {
      getVersion: jest.fn().mockReturnValue("1.0.0"),
    },
    autoUpdater: {
      setFeedURL: jest.fn(),
      on: jest.fn((event, cb) => {
        listeners[event] = cb
      }),
      checkForUpdates: jest.fn(),
      quitAndInstall: jest.fn(),
      trigger: (event: string, ...args: any[]) => {
        if (listeners[event]) listeners[event](...args)
      },
    },
    ipcMain: {
      handle: jest.fn((channel, cb) => {
        ipcListeners[channel] = cb
      }),
      trigger: (channel: string, ...args: any[]) => {
        if (ipcListeners[channel]) ipcListeners[channel](...args)
      },
    },
  }
})

jest.mock("../src/modules/logger", () => ({
  createLogger: () => ({
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  }),
}))

jest.mock("../src/modules/store", () => ({
  storeIsReady: jest.fn().mockResolvedValue(true),
  store: {
    data: {
      settings: {
        automaticUpdates: true,
      },
    },
  },
}))

jest.mock("../src/modules/window", () => ({
  send: jest.fn(),
}))

describe("updater module", () => {
  let originalPlatform: NodeJS.Platform

  beforeEach(() => {
    jest.clearAllMocks()
    originalPlatform = process.platform
    jest.useFakeTimers()
  })

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform })
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it("sets up updater and registers events", () => {
    Object.defineProperty(process, "platform", { value: "win32" })
    const platform = process.platform
    const arch = process.arch

    setupUpdater()

    expect(autoUpdater.setFeedURL).toHaveBeenCalledWith({
      url: `https://update.electronjs.org/toto04/webeep-sync/${platform}-${arch}/1.0.0`,
    })

    expect(autoUpdater.on).toHaveBeenCalledWith("error", expect.any(Function))
    expect(autoUpdater.on).toHaveBeenCalledWith(
      "checking-for-update",
      expect.any(Function),
    )
    expect(autoUpdater.on).toHaveBeenCalledWith(
      "update-not-available",
      expect.any(Function),
    )
    expect(autoUpdater.on).toHaveBeenCalledWith(
      "update-available",
      expect.any(Function),
    )
    expect(autoUpdater.on).toHaveBeenCalledWith(
      "update-downloaded",
      expect.any(Function),
    )
    expect(ipcMain.handle).toHaveBeenCalledWith(
      "quit-and-install",
      expect.any(Function),
    )
  })

  it("handles update-downloaded event", () => {
    setupUpdater()
    expect(isUpdateAvailable()).toBe(false)
    ;(autoUpdater as any).trigger("update-downloaded")

    expect(isUpdateAvailable()).toBe(true)

    const { send } = require("../src/modules/window")
    expect(send).toHaveBeenCalledWith("update-available")
  })

  it("handles quit-and-install IPC event", () => {
    setupUpdater()
    ;(ipcMain as any).trigger("quit-and-install")
    expect(autoUpdater.quitAndInstall).toHaveBeenCalled()
  })

  it("checks for updates if settings allow", async () => {
    Object.defineProperty(process, "platform", { value: "win32" })

    await checkForUpdates()

    expect(storeIsReady).toHaveBeenCalled()
    expect(autoUpdater.checkForUpdates).toHaveBeenCalled()
  })

  it("does not check for updates on linux", async () => {
    Object.defineProperty(process, "platform", { value: "linux" })

    await checkForUpdates()
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled()
  })
})
