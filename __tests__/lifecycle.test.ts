import { setLoginItem, windowsLoginSettings } from "../src/modules/lifecycle"
import { app } from "electron"

jest.mock("electron", () => {
  return {
    app: {
      whenReady: jest.fn().mockResolvedValue(true),
      getLoginItemSettings: jest.fn(),
      setLoginItemSettings: jest.fn(),
    },
  }
})

jest.mock("../src/modules/logger", () => ({
  createLogger: () => ({ debug: jest.fn() }),
}))

describe("lifecycle module", () => {
  let originalPlatform: NodeJS.Platform

  beforeEach(() => {
    jest.clearAllMocks()
    originalPlatform = process.platform
  })

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform })
  })

  it("does nothing on linux", async () => {
    Object.defineProperty(process, "platform", { value: "linux" })

    await setLoginItem(true)
    expect(app.whenReady).not.toHaveBeenCalled()
  })

  it("sets login item settings when changed", async () => {
    Object.defineProperty(process, "platform", { value: "win32" })
    ;(app.getLoginItemSettings as jest.Mock).mockReturnValue({
      openAtLogin: false,
    })

    await setLoginItem(true)

    expect(app.whenReady).toHaveBeenCalled()
    expect(app.getLoginItemSettings).toHaveBeenCalledWith(windowsLoginSettings)
    expect(app.setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true,
      openAsHidden: true,
      ...windowsLoginSettings,
    })
  })

  it("does nothing when setting is same", async () => {
    Object.defineProperty(process, "platform", { value: "win32" })
    ;(app.getLoginItemSettings as jest.Mock).mockReturnValue({
      openAtLogin: true,
    })

    await setLoginItem(true)

    expect(app.whenReady).toHaveBeenCalled()
    expect(app.setLoginItemSettings).not.toHaveBeenCalled()
  })
})
