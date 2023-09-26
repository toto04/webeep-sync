import { ipcRenderer } from "electron"
import React, { FC, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { IoCheckmarkDoneCircle, IoNotifications } from "react-icons/io5"
import { MoodleNotification } from "../../modules/moodle"
import useOnOutsideClick from "../hooks/useOnOutsideClick"
import { NotificationInfo } from "./NotificationInfo"

// this is here to throttle the click event to prevent the tooltip from reopening immediately
let clickEnabled = true

/**
 * Component containing the Notification icon and the tooltip list that appears when the icon is
 * clicked.
 *
 * Each element and the detailed modal is handled in the {@link NotificationInfo} component.
 */
export const NotificationList: FC = props => {
  const [showingTooltip, setShowingTooltip] = useState(false)

  const [notifications, setNotifications] = useState<MoodleNotification[]>([])
  const [toBeOpened, setToBeOpened] = useState<number | null>(null)
  const [unread, setUnread] = useState(0)
  const [shadow, setShadow] = useState(false)
  const { t } = useTranslation("client", {
    keyPrefix: "mainView.notifications",
  })

  const wrapRef = useRef<HTMLDivElement>(null)
  useOnOutsideClick(wrapRef, () => {
    if (showingTooltip) {
      setShowingTooltip(false)
      // wait a bit to prevent the tooltip from reopening immediately
      clickEnabled = false
      setTimeout(() => (clickEnabled = true), 250)
    }
  })

  useEffect(() => {
    setUnread(notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0))
  }, [notifications])

  useEffect(() => {
    // notification event handler
    ipcRenderer.on("notifications", (e, n) => setNotifications(n))
    ipcRenderer.invoke("get-notifications").then(n => setNotifications(n))
    ipcRenderer.invoke("notification-to-be-opened").then(n => {
      setToBeOpened(n)
      setShowingTooltip(n != null)
      if (n != null) ipcRenderer.invoke("mark-notification-read", n)
    })
  }, [])

  useEffect(() => {
    if (showingTooltip)
      ipcRenderer.invoke("get-notifications").then(n => setNotifications(n))
  }, [showingTooltip])

  return (
    <div
      className="notification-icon"
      tabIndex={-1}
      onKeyDown={e => {
        if (!showingTooltip) return
        if (e.key === "Escape") {
          // hide the tooltip if esc is pressed
          e.preventDefault()
          setShowingTooltip(false)
        }
      }}
    >
      <div
        className={
          "clickable" +
          (showingTooltip ? " clicked" : "") +
          (unread ? " badge" : "")
        }
        onClick={() => {
          if (!showingTooltip && clickEnabled) setShowingTooltip(true)
        }}
      >
        <IoNotifications />
      </div>
      {showingTooltip && (
        <div
          ref={wrapRef}
          className="notification-list"
          onScroll={e => {
            if (e.currentTarget.scrollTop > 5 && !shadow) setShadow(true)
            else if (e.currentTarget.scrollTop <= 5 && shadow) setShadow(false)
          }}
        >
          <div
            className={`notification-list-header modal-header ${
              shadow ? "shadow" : ""
            }`}
          >
            <span>Messaggi da WeBeep</span>
            <div
              className="notification-read-all"
              onClick={() => {
                ipcRenderer.invoke("mark-all-notifications-read")
              }}
            >
              <span>{t("setAllRead")}</span>
              <div className="clickable">
                <IoCheckmarkDoneCircle />
              </div>
            </div>
          </div>
          {notifications && notifications.length ? (
            <div className="notification-list-wrap">
              {notifications.map((n, i) => (
                <NotificationInfo
                  notification={n}
                  toBeOpened={toBeOpened === n.id}
                  onShow={() => {
                    // do not auto open twice
                    if (toBeOpened === n.id) setToBeOpened(null)
                  }}
                  key={"notification" + i}
                />
              ))}
            </div>
          ) : (
            <div className="no-notifications">{t("no_notifications")}</div>
          )}
        </div>
      )}
    </div>
  )
}
