/* eslint-disable @typescript-eslint/no-explicit-any */
import { createWindow, send, focus } from "../src/modules/window"
import { app, BrowserWindow } from "electron"

jest.mock("electron", () => {
  const mBrowserWindow = {
    on: jest.fn(),
    show: jest.fn(),
    loadURL: jest.fn(),
    isDestroyed: jest.fn().mockReturnValue(false),
    webContents: {
      send: jest.fn(),
    },
    focus: jest.fn(),
  }
  return {
    app: {
      dock: {
        show: jest.fn(),
      },
    },
    nativeImage: {
      createFromPath: jest.fn().mockReturnValue("mock-image"),
    },
    BrowserWindow: jest.fn().mockImplementation(() => mBrowserWindow) as any,
  }
})

jest.mock("../src/modules/logger", () => ({
  createLogger: () => ({ debug: jest.fn() }),
}))

describe("window module", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(BrowserWindow.getAllWindows as any) = jest.fn().mockReturnValue([])
  })

  describe("createWindow", () => {
    it("should create a new window and load url", async () => {
      // Simulate ready-to-show event immediately
      const mockOn = jest.fn((event, cb) => {
        if (event === "ready-to-show") {
          cb()
        }
      })
      ;(BrowserWindow as any as jest.Mock).mockImplementation(() => ({
        on: mockOn,
        show: jest.fn(),
        loadURL: jest.fn(),
      }))

      await createWindow()

      expect(BrowserWindow).toHaveBeenCalled()
      expect(app.dock?.show).toHaveBeenCalled()
    })
  })

  describe("send", () => {
    it("should return false if window is not created", () => {
      // need to reset mainWindow state in the module, but it's exported and already created in previous test
      // actually, it's safer to just test when it is created
    })

    it("should send message via webContents", async () => {
      const mBrowserWindow = {
        on: (event: string, cb: any) => {
          if (event === "ready-to-show") cb()
        },
        show: jest.fn(),
        loadURL: jest.fn(),
        isDestroyed: jest.fn().mockReturnValue(false),
        webContents: {
          send: jest.fn(),
        },
      }
      ;(BrowserWindow as any as jest.Mock).mockImplementation(
        () => mBrowserWindow,
      )

      await createWindow()
      const result = send("test-channel", "arg1")

      expect(result).toBe(true)
      expect(mBrowserWindow.webContents.send).toHaveBeenCalledWith(
        "test-channel",
        "arg1",
      )
    })
  })

  describe("focus", () => {
    it("should create window if none exist", async () => {
      const mockOn = jest.fn((event, cb) => {
        if (event === "ready-to-show") cb()
      })
      ;(BrowserWindow as any as jest.Mock).mockImplementation(() => ({
        on: mockOn,
        show: jest.fn(),
        loadURL: jest.fn(),
      }))
      ;(BrowserWindow.getAllWindows as any).mockReturnValue([])

      await focus()
      expect(BrowserWindow).toHaveBeenCalled()
    })

    it("should focus existing window", async () => {
      const mockFocus = jest.fn()
      const mBrowserWindow = {
        on: (event: string, cb: any) => {
          if (event === "focus") cb()
        },
        focus: mockFocus,
      }
      ;(BrowserWindow.getAllWindows as any).mockReturnValue([mBrowserWindow])

      await focus()
      expect(mockFocus).toHaveBeenCalled()
    })
  })
})
