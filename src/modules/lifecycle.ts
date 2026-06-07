import { app } from "electron"
import path from "path"
import { createLogger } from "./logger"

const { debug } = createLogger("APP")
const DEV = process.argv.includes("--dev")

export const windowsLoginSettings = {
  path: path.resolve(path.dirname(process.execPath), "../Update.exe"),
  args: [
    "--processStart",
    `"${path.basename(process.execPath)}"`,
    "--process-start-args",

    '"--hidden --tray-only"',
  ],
}

export async function setLoginItem(openAtLogin: boolean) {
  if (DEV) return
  if (process.platform === "linux") return

  await app.whenReady()

  const loginItemSettings = app.getLoginItemSettings(windowsLoginSettings)
  if (openAtLogin !== loginItemSettings.openAtLogin) {
    debug(`Setting openAtLogin to ${openAtLogin}`)
    app.setLoginItemSettings({
      openAtLogin,
      openAsHidden: true,
      ...windowsLoginSettings,
    })
  } else {
    debug(`openAtLogin is already ${openAtLogin}`)
  }
}
