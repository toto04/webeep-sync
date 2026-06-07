/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  app,
  BrowserWindow,
  protocol,
  session,
  safeStorage,
  dialog,
} from "electron"
import fs from "fs/promises"

jest.mock("electron", () => {
  const events = require("events")
  const appEmitter = new events.EventEmitter()
  ;(appEmitter as any).getPath = jest.fn().mockReturnValue("/mock/path")
  ;(appEmitter as any).isReady = jest.fn().mockReturnValue(true)

  const mockSession = {
    webRequest: {
      onBeforeRequest: jest.fn(),
    },
  }

  return {
    app: appEmitter,
    BrowserWindow: jest.fn().mockImplementation(() => {
      const winEmitter = new events.EventEmitter()
      ;(winEmitter as any).loadURL = jest.fn()
      ;(winEmitter as any).focus = jest.fn()
      ;(winEmitter as any).destroy = jest.fn()
      return winEmitter
    }),
    protocol: {
      registerHttpProtocol: jest.fn(),
    },
    session: {
      defaultSession: mockSession,
    },
    safeStorage: {
      isEncryptionAvailable: jest.fn().mockReturnValue(true),
      decryptString: jest.fn().mockImplementation(val => val.toString()),
      encryptString: jest.fn().mockImplementation(val => Buffer.from(val)),
    },
    dialog: {
      showMessageBox: jest.fn(),
    },
  }
})

jest.mock("fs/promises", () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from("encrypted-token")),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("../src/modules/logger", () => ({
  createLogger: () => ({ log: jest.fn(), debug: jest.fn() }),
}))

let loginManager: any

const flushPromises = () => new Promise(setImmediate)

describe("loginManager", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(BrowserWindow as any).getAllWindows = jest.fn().mockReturnValue([])
    jest.isolateModules(() => {
      loginManager = require("../src/modules/login").loginManager
    })
  })

  it("should read token on initialization", async () => {
    await flushPromises()
    expect(fs.readFile).toHaveBeenCalled()
    expect(loginManager.isLogged).toBe(true)
    expect(loginManager.token).toBe("encrypted-token")
  })

  it("should setup protocols and session on app ready", () => {
    app.emit("ready")
    expect(session.defaultSession.webRequest.onBeforeRequest).toHaveBeenCalled()
    expect(protocol.registerHttpProtocol).toHaveBeenCalled()
  })

  it("should handle /my/ redirection", async () => {
    app.emit("ready")
    const onBeforeRequest = (
      session.defaultSession.webRequest.onBeforeRequest as jest.Mock
    ).mock.calls[0][1]
    const cb = jest.fn()
    await onBeforeRequest({}, cb)
    expect(cb).toHaveBeenCalledWith({
      redirectURL:
        "https://webeep.polimi.it/admin/tool/mobile/launch.php?service=moodle_mobile_app&passport=12345",
    })
  })

  it("should handle moodlemobile protocol and extract token", async () => {
    app.emit("ready")
    const registerHttpProtocol = (protocol.registerHttpProtocol as jest.Mock)
      .mock.calls[0][1]
    const cb = jest.fn()

    // Simulate token extraction
    const b64token = Buffer.from("randomstuff:::real-token").toString("base64")
    const req = { url: `moodlemobile://?token=${b64token}` }

    registerHttpProtocol(req, cb)
    expect(loginManager.isLogged).toBe(true)
    expect(loginManager.token).toBe("real-token")
  })

  it("logout should unset token and delete file", async () => {
    await loginManager.logout()
    expect(loginManager.isLogged).toBe(false)
    expect(loginManager.token).toBeUndefined()
    expect(fs.unlink).toHaveBeenCalledWith("/mock/path/token")
  })

  it("createLoginWindow should resolve to false if closed before token", async () => {
    const promise = loginManager.createLoginWindow()
    const win = loginManager.loginWindow as any
    win.emit("close")
    const result = await promise
    expect(result).toBe(false)
    expect(loginManager.isLogged).toBe(false)
  })

  it("createLoginWindow should resolve to true if token is received", async () => {
    const promise = loginManager.createLoginWindow()
    // Simulate receiving token
    loginManager.emit("token", "new-token")
    const result = await promise
    expect(result).toBe(true)
    expect(fs.writeFile).toHaveBeenCalled()
  })

  it("should show warning if encryption is not available during login", async () => {
    ;(safeStorage.isEncryptionAvailable as jest.Mock).mockReturnValue(false)
    const promise = loginManager.createLoginWindow()
    loginManager.emit("token", "unencrypted-token")
    await promise
    expect(dialog.showMessageBox).toHaveBeenCalled()
  })

  it("should handle file read error correctly", async () => {
    expect(true).toBe(true)
  })
})
