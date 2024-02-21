import path from "path"
import { BrowserWindow, Menu, nativeImage, shell, Tray } from "electron"
import { createLogger } from "./logger"
import { __static } from "../util"
import { downloadManager } from "./download"
import { store, storeIsReady } from "./store"
import { i18n } from "./i18next"
import { focus } from "./window"

const trayImg = nativeImage.createFromPath(
  path.join(__static, "/icons/tray.png"),
)

const { debug } = createLogger("TRAY")

export let tray: Tray = null

export function setupTray() {
  debug("Setting up tray")
  tray = new Tray(trayImg)
  tray.setToolTip("Webeep Sync")
  tray.on("click", () => {
    process.platform === "win32" ? focus() : undefined
  })
}

export async function updateTrayContext() {
  if (tray === null) return
  if (tray.isDestroyed()) return
  debug("Updating tray context")
  await storeIsReady()
  const t = i18n.getFixedT(null, "tray", null)

  const s = downloadManager.syncing
  const ae = store.data.settings.autosyncEnabled
  tray.setContextMenu(
    Menu.buildFromTemplate([
      // { label: 'WebeepSync', type: 'submenu' },
      { label: t("open"), click: () => focus() },
      {
        label: t("openFolder"),
        click: () => shell.openPath(store.data.settings.downloadPath),
      },
      { type: "separator" },
      {
        label: s ? t("stopSyncing") : t("syncNow"),
        sublabel: s ? t("syncInProgress") : undefined,
        click: () => (s ? downloadManager.stop() : downloadManager.sync()),
      },
      {
        label: t("toggleAutosync", {
          toggle: ae ? t("toggle.off") : t("toggle.on"),
        }),
        icon: path.join(__static, "icons", ae ? "pause.png" : "play.png"),
        click: async () => {
          await downloadManager.setAutosync(!ae)
          BrowserWindow.getAllWindows()[0]?.webContents.send("autosync", !ae)
          updateTrayContext()
        },
      },
      { type: "separator" },
      { label: t("quit"), role: "quit" },
    ]),
  )
}
