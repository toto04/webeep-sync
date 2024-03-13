import React, { FC, useEffect, useRef, useState } from "react"
import { ipcRenderer, shell } from "electron"
import { sanitize } from "dompurify"
import { Modal } from "./Modal"
import { MoodleNotification } from "../../modules/moodle"
import { Link } from "./Link"

const { format } = Intl.DateTimeFormat("it-IT", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
})

/**
 * Component wrapping each notification in the list. Also handles the detailed modal.
 */
export const NotificationInfo: FC<{
  notification: MoodleNotification
  toBeOpened: boolean
  onShow?: () => void
}> = props => {
  const { title, read, htmlbody, url, timecreated, id } = props.notification
  const [showing, setShowing] = useState(props.toBeOpened)

  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showing) props.onShow?.()
  }, [showing])

  useEffect(() => {
    // when the innerhtml is set
    if (contentRef.current) {
      // change anchor behaviour to open in external browser
      contentRef.current.querySelectorAll("a").forEach(a => {
        a.addEventListener("click", e => {
          e.preventDefault()
          shell.openExternal(a.href)
        })
      })
      // slightly modify margins
      const el = contentRef.current.querySelector<HTMLDivElement>(".content")
      if (el) el.style.marginBottom = "0"
    }
  }, [contentRef, showing])

  const elem = sanitize(htmlbody, { RETURN_DOM: true })
  const post = elem.querySelector(".forum-post")
  if (!post) return null
  try {
    post.querySelectorAll(".header .picture").forEach(e => e.remove())
    post.querySelectorAll(".link").forEach(e => e.remove())
    post.querySelectorAll(".commands").forEach(e => e.remove())
  } catch (e) {
    console.error("Error while removing elements from notification")
  }

  return (
    <div
      className="notification"
      onClick={e => {
        if (!showing) {
          setShowing(true)
          // mark as read if not already
          if (!read) ipcRenderer.invoke("mark-notification-read", id)
        }
      }}
    >
      <div className="notification-content">
        <div className="notification-brief">
          <p>{title}</p>
          <span>{format(timecreated * 1000)}</span>
        </div>
        {!read && <div className="unread-badge" />}
      </div>
      {showing && (
        <Modal title={title} onClose={() => setShowing(false)}>
          <div className="notification-info">
            <div
              ref={contentRef}
              dangerouslySetInnerHTML={{ __html: post.innerHTML }}
            />
            <Link href={url} className="button confirm-button">
              Apri la notifica nel browser
            </Link>
          </div>
        </Modal>
      )}
    </div>
  )
}
