/* eslint-disable @typescript-eslint/no-explicit-any */
import { tray, setupTray, updateTrayContext } from "../src/modules/tray"
import { Tray, Menu, shell, BrowserWindow } from "electron"
import { downloadManager } from "../src/modules/download"
import { storeIsReady } from "../src/modules/store"
import { focus } from "../src/modules/window"

jest.mock("electron", () => {
  return {
    Tray: jest.fn().mockImplementation(() => ({
      setToolTip: jest.fn(),
      on: jest.fn(),
      setContextMenu: jest.fn(),
      isDestroyed: jest.fn().mockReturnValue(false),
    })),
    Menu: {
      buildFromTemplate: jest.fn().mockImplementation(tpl => tpl),
    },
    nativeImage: {
      createFromPath: jest.fn(),
    },
    shell: {
      openPath: jest.fn(),
    },
    BrowserWindow: {
      getAllWindows: jest.fn().mockReturnValue([
        {
          webContents: {
            send: jest.fn(),
          },
        },
      ]),
    },
  }
})

jest.mock("../src/modules/logger", () => ({
  createLogger: () => ({ debug: jest.fn() }),
}))

jest.mock("../src/modules/download", () => ({
  downloadManager: {
    syncing: false,
    stop: jest.fn(),
    sync: jest.fn(),
    setAutosync: jest.fn(),
  },
}))

jest.mock("../src/modules/store", () => ({
  store: {
    data: {
      settings: {
        autosyncEnabled: true,
        downloadPath: "/test/path",
      },
    },
  },
  storeIsReady: jest.fn().mockResolvedValue(true),
}))

jest.mock("../src/modules/window", () => ({
  focus: jest.fn(),
}))

jest.mock("../src/modules/i18next", () => ({
  i18n: {
    getFixedT: () => (k: string) => k,
  },
}))

describe("tray", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(Tray as any as jest.Mock).mockClear()
  })

  it("setupTray should initialize tray correctly", () => {
    setupTray()
    expect(Tray).toHaveBeenCalledTimes(1)
    expect(tray).toBeDefined()
    expect(tray.setToolTip).toHaveBeenCalledWith("WeBeep Sync")
  })

  it("updateTrayContext should not fail if tray is null", async () => {
    // We cannot easily test when tray is null because it's exported and initialized
    // but if it is we can mock it
    const originalTray = tray
    ;(tray as any) = null
    await updateTrayContext()
    expect(Menu.buildFromTemplate).not.toHaveBeenCalled()
    ;(tray as any) = originalTray
  })

  it("updateTrayContext should update the menu", async () => {
    setupTray() // initialize tray
    await updateTrayContext()

    expect(storeIsReady).toHaveBeenCalled()
    expect(Menu.buildFromTemplate).toHaveBeenCalled()

    const menuTpl = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0]
    expect(menuTpl.length).toBeGreaterThan(0)

    // Test Open
    menuTpl[0].click()
    expect(focus).toHaveBeenCalled()

    // Test Open Folder
    menuTpl[1].click()
    expect(shell.openPath).toHaveBeenCalledWith("/test/path")

    // Test Sync
    menuTpl[3].click() // syncNow
    expect(downloadManager.sync).toHaveBeenCalled()

    // Test autosync toggle
    await menuTpl[4].click()
    expect(downloadManager.setAutosync).toHaveBeenCalledWith(false)
    expect(
      BrowserWindow.getAllWindows()[0].webContents.send,
    ).toHaveBeenCalledWith("autosync", false)
  })

  it("updateTrayContext should render correctly when syncing is true", async () => {
    setupTray()
    ;(downloadManager as any).syncing = true
    await updateTrayContext()

    const menuTpl = (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0]
    // Test Stop Sync
    menuTpl[3].click() // stopSyncing
    expect(downloadManager.stop).toHaveBeenCalled()
  })
})
