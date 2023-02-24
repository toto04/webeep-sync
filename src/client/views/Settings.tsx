import { platform } from "os"
import { ipcRenderer } from "electron"
import React, { FC, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { IoWarning } from "react-icons/io5"
import { Settings } from "../../modules/store"
import { Modal } from "../components/Modal"
import { Link } from "../components/Link"

import PolinetworkLogo from "../assets/polinetwork.svg"
import { Switch } from "../components/Switch"

const themes = ["light", "dark", "system"] as const
type Theme = (typeof themes)[number]

const isLinux = platform() === "linux"

let prevTheme: Theme // the previous theme is stored in case the users cancel the settigns change
export const SettingsModal: FC<{ onClose: () => void }> = props => {
  const { t } = useTranslation("client", { keyPrefix: "settings" })

  const [settings, updateSettigns] =
    useState<
      Omit<Settings, "autosyncEnabled" | "downloadPath" | "autosyncInterval">
    >()
  const [theme, setTheme] = useState<Theme>("system")
  const [version, setVersion] = useState("")

  useEffect(() => {
    ipcRenderer.invoke("settings").then(s => updateSettigns(s))
    ipcRenderer.invoke("get-native-theme").then(t => {
      setTheme(t)
      prevTheme = t
    })
    ipcRenderer.invoke("version").then(v => setVersion(v))
  }, [])

  return (
    <Modal title={t("settings")} onClose={() => props.onClose()}>
      {settings ? (
        <div className="settings">
          <div className="setting-section">
            {theme ? (
              <div className="setting">
                <span>{t("colorTheme")}</span>
                <select
                  value={theme}
                  onChange={e => {
                    const theme = e.target.value as Theme
                    ipcRenderer.send("set-native-theme", theme)
                    setTheme(theme)
                    updateSettigns({ ...settings, nativeThemeSource: theme })
                  }}
                >
                  <option value="system">{t("theme.system")}</option>
                  <option value="light">{t("theme.light")}</option>
                  <option value="dark">{t("theme.dark")}</option>
                </select>
              </div>
            ) : undefined}

            <div className="setting">
              <span>{t("language")}</span>
              <select
                value={settings.language}
                onChange={e => {
                  const language = e.target.value as "it" | "en"
                  updateSettigns({ ...settings, language })
                }}
              >
                <option value="it">Italiano</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="setting-section">
            {isLinux ? undefined : (
              <>
                <div className="setting">
                  <span>{t("automaticUpdates")}</span>
                  <Switch
                    onChange={v =>
                      updateSettigns({ ...settings, automaticUpdates: v })
                    }
                    checked={settings.automaticUpdates}
                  />
                  <span className="desc">{t("automaticUpdates_desc")}</span>
                </div>

                <div className="setting">
                  <span>{t("openAtLogin")}</span>
                  <Switch
                    onChange={v =>
                      updateSettigns({ ...settings, openAtLogin: v })
                    }
                    checked={settings.openAtLogin}
                  />
                </div>
              </>
            )}

            <div className="setting">
              <span>{t("keepOpenInBackground")}</span>
              <Switch
                onChange={v =>
                  updateSettigns({ ...settings, keepOpenInBackground: v })
                }
                checked={settings.keepOpenInBackground}
              />
              <span className="desc">{t("keepOpenInBackground_desc")}</span>
            </div>

            <div
              className={`setting ${
                settings.keepOpenInBackground ? "" : "disabled"
              }`}
            >
              <span>{t("showInTray")}</span>
              <Switch
                disabled={!settings.keepOpenInBackground}
                onChange={v => updateSettigns({ ...settings, trayIcon: v })}
                checked={settings.keepOpenInBackground && settings.trayIcon}
              />
            </div>

            {settings.keepOpenInBackground && !settings.trayIcon ? (
              <div className="setting-warn">
                <IoWarning />
                <span>{t("trayWarning")}</span>
              </div>
            ) : undefined}
          </div>

          <div className="setting-section">
            <div
              className={`setting ${
                settings.keepOpenInBackground ? "" : "disabled"
              }`}
            >
              <span>{t("notifications")}</span>
              <Switch
                disabled={!settings.keepOpenInBackground}
                onChange={v =>
                  updateSettigns({ ...settings, notificationOnNewFiles: v })
                }
                checked={
                  settings.keepOpenInBackground &&
                  settings.notificationOnNewFiles
                }
              />
            </div>

            <div
              className={`setting ${
                settings.keepOpenInBackground ? "" : "disabled"
              }`}
            >
              <span>{t("msgNotifications")}</span>
              <Switch
                disabled={!settings.keepOpenInBackground}
                onChange={v =>
                  updateSettigns({ ...settings, notificationOnMessage: v })
                }
                checked={
                  settings.keepOpenInBackground &&
                  settings.notificationOnMessage
                }
              />
            </div>
          </div>

          <div className="setting-section">
            <div className="setting">
              <span>{t("newCourses")}</span>
              <Switch
                onChange={v =>
                  updateSettigns({ ...settings, syncNewCourses: v })
                }
                checked={settings.syncNewCourses}
              />
              <span className="desc">{t("newCourses_desc")}</span>
            </div>
            <div className="setting">
              <span>{t("concurrentDownloads")}</span>
              <input
                type="number"
                min={1}
                max={100}
                value={settings.maxConcurrentDownloads}
                onChange={e => {
                  let maxConcurrentDownloads = parseInt(e.target.value)
                  if (maxConcurrentDownloads > 100) maxConcurrentDownloads = 100
                  updateSettigns({ ...settings, maxConcurrentDownloads })
                }}
              />
              <span className="desc">{t("concurrentDownloads_desc")}</span>
            </div>
          </div>

          <button
            className="danger-button"
            onClick={() => {
              ipcRenderer.send("logout")
            }}
          >
            {t("logout")}
          </button>

          <span className="credits">
            <span>v{version}</span>
            <br />
            Developed by Tommaso Morganti •{" "}
            <Link href="https://github.com/toto04">GitHub</Link>
            <br />
            <Link href="https://github.com/toto04/webeep-sync">
              Source code
            </Link>{" "}
            •&nbsp;
            <Link href="https://github.com/toto04/webeep-sync/issues">
              Report a Bug
            </Link>
            <br />
            <br />
            <Link href="https://polinetwork.org" style={{ color: "#888" }}>
              <PolinetworkLogo fill="#888" height={32} width={32} />
              <br />
              Powered by PoliNetwork
            </Link>
          </span>

          <div className="button-line-container">
            <button
              className="discard-button"
              onClick={() => {
                if (prevTheme) ipcRenderer.send("set-native-theme", prevTheme)
                props.onClose()
              }}
            >
              {t("cancel")}
            </button>
            <button
              className="confirm-button"
              onClick={async () => {
                await ipcRenderer.invoke("set-settings", settings)
                props.onClose()
              }}
            >
              {t("ok")}
            </button>
          </div>
        </div>
      ) : undefined}
    </Modal>
  )
}
