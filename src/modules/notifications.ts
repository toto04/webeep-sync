import { Notification } from "electron"
import { i18n } from "./i18next"
import { storeIsReady, store } from "./store"
import { downloadManager, NewFilesList } from "./download"
import { moodleClient, MoodleNotification } from "./moodle"
import { focus, send } from "./window"

let syncedItems: NewFilesList = {}
let notificationToBeOpened: number | null = null

export function getSyncedItems() {
  const items = syncedItems
  setImmediate(() => (syncedItems = {}))
  return items
}

export function getNotificationToBeOpened() {
  const id = notificationToBeOpened
  if (id) {
    setImmediate(() => (notificationToBeOpened = null))
  }
  return id
}

export function setupNotifications() {
  downloadManager.on("new-files", files => {
    const sent = send("new-files", files)

    if (!sent) {
      let numfiles = 0
      for (const course in files) {
        numfiles += files[course].length
        if (!syncedItems[course]) syncedItems[course] = []
        syncedItems[course].push(...files[course])
      }

      if (
        numfiles &&
        store.data.settings.keepOpenInBackground &&
        store.data.settings.notificationOnNewFiles &&
        Notification.isSupported()
      ) {
        showNewFilesNotification(numfiles)
      }
    }
  })

  moodleClient.on("notifications", async notifications => {
    send("notifications", notifications)

    Object.entries(store.data.persistence.sentMessageNotifications).forEach(
      ([id, { sentTimestamp }]) => {
        if (
          sentTimestamp < Date.now() - 1000 * 60 * 60 * 24 * 7 &&
          !notifications.find(n => n.id === parseInt(id))
        )
          delete store.data.persistence.sentMessageNotifications[id]
      },
    )

    await storeIsReady()
    const newNotifications = notifications
      .filter(n => !n.read)
      .filter(n => !store.data.persistence.sentMessageNotifications[n.id])

    newNotifications.forEach(
      n =>
        (store.data.persistence.sentMessageNotifications[n.id] = {
          sentTimestamp: Date.now(),
        }),
    )
    store.write()

    if (
      store.data.settings.keepOpenInBackground &&
      store.data.settings.notificationOnMessage &&
      Notification.isSupported()
    ) {
      newNotifications.forEach(n => showMessageNotification(n))
    }
  })
}

async function showNewFilesNotification(numfiles: number) {
  await storeIsReady()
  const t = i18n.getFixedT(null, "notifications", "newFiles")

  const courses = Object.keys(syncedItems)
  let body = t("body.default")

  if (!store.data.persistence.notificationsHasBeenSent) {
    body = t("body.firstNotification")
    store.data.persistence.notificationsHasBeenSent = true
    store.write()
  } else if (numfiles === 1) {
    const coursename = courses[0]
    const file = syncedItems[coursename][0]
    body = t("body.singleFile", { filename: file.filename, coursename })
  } else {
    if (courses.length === 1)
      body = t("body.singleCourse", { coursename: courses[0] })
    else body = t("body.multipleCourses", { count: courses.length })
  }

  const notification = new Notification({
    title: t("notificationTitle", { count: numfiles }),
    body,
  })
  notification.on("click", () => focus())
  notification.show()
}

async function showMessageNotification(moodleNotif: MoodleNotification) {
  await storeIsReady()
  const t = i18n.getFixedT(null, "notifications", "newMessage")

  const notification = new Notification({
    title: t("notificationTitle"),
    body: moodleNotif.title,
  })
  notification.on("click", async () => {
    notificationToBeOpened = moodleNotif.id
    await focus()
  })
  notification.show()
}
