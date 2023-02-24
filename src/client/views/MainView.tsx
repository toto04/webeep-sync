import { ipcRenderer } from "electron"
import { i18n } from "i18next"
import React, { FC, useContext, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { IoSettingsSharp, IoWarning, IoRefreshCircle } from "react-icons/io5"
import { LoginContext } from "../LoginContext"
import { NotificationList } from "../components/NotificationList"

let _i18n: i18n

function readableTime(lastSynced?: number): string {
  const t = _i18n.getFixedT(null, "client", "mainView.readableTime")
  if (!lastSynced) return t("never")
  let dt = (Date.now() - lastSynced) / 1000
  if (dt < 60) return t("now")
  dt = Math.floor(dt / 60)
  if (dt < 60) return t("minute", { count: dt })
  dt = Math.floor(dt / 60)
  if (dt < 24) return t("hour", { count: dt })
  dt = Math.floor(dt / 24)
  if (dt < 31) return t("day", { count: dt })
  return t("months")
}

export const MainView: FC<{
  onLogin: () => void
  onSettings: () => void
}> = props => {
  const { isLogged, username, syncing, connected } = useContext(LoginContext)

  const { t, i18n } = useTranslation("client", { keyPrefix: "mainView" })

  const [elapsedTime, setElapsedTime] = useState("...")
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    _i18n = i18n
    const updateTime = async () => {
      const ls = await ipcRenderer.invoke("lastsynced")
      setElapsedTime(readableTime(ls))
    }
    setInterval(() => updateTime(), 60000)
    i18n.on("languageChanged", () => updateTime())
    ipcRenderer.on("syncing", () => updateTime())
    updateTime()

    ipcRenderer.on("new-update", (e, update) => setUpdateAvailable(update))
    ipcRenderer.on("update-available", e => setUpdateAvailable(true))
  }, [])

  return (
    <div className="main-view section">
      <div className="last-synced">
        <span>{t("lastSynced")}</span>
        <h1>{elapsedTime}</h1>
      </div>
      <button
        className={
          "sync-now " + (syncing ? "discard-button" : "confirm-button")
        }
        onClick={() => {
          if (isLogged) ipcRenderer.send(syncing ? "sync-stop" : "sync-start")
          else props.onLogin()
        }}
      >
        <span>
          {syncing ? t("stop") : isLogged ? t("sync") : t("loginToSync")}
        </span>
      </button>
      <div className="user-status">
        <div className="status-icons">
          {updateAvailable && !syncing ? (
            <div
              className="clickable"
              onClick={() => ipcRenderer.invoke("quit-and-install")}
              title={t("updateAvailable")}
            >
              <IoRefreshCircle className="new-update" />
            </div>
          ) : undefined}
          <NotificationList />
          <div className="clickable">
            <IoSettingsSharp onClick={() => props.onSettings()} />
          </div>
        </div>
        <div className="login-info">
          {connected ? undefined : (
            <IoWarning className="warning" title={t("notConnected")} />
          )}
          {isLogged ? (
            <span>{username}</span>
          ) : (
            <a className="text-button" onClick={() => props.onLogin()}>
              {t("login")}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
