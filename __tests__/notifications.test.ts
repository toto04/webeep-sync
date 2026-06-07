import {
  setupNotifications,
  getSyncedItems,
  getNotificationToBeOpened,
} from "../src/modules/notifications"
import { Notification } from "electron"
import { downloadManager } from "../src/modules/download"
import { moodleClient } from "../src/modules/moodle"
import { store } from "../src/modules/store"
import { send } from "../src/modules/window"

jest.mock("electron", () => {
  return {
    Notification: Object.assign(
      jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        show: jest.fn(),
      })),
      {
        isSupported: jest.fn().mockReturnValue(true),
      },
    ),
  }
})

jest.mock("../src/modules/download", () => ({
  downloadManager: {
    on: jest.fn(),
  },
}))

jest.mock("../src/modules/moodle", () => ({
  moodleClient: {
    on: jest.fn(),
  },
}))

jest.mock("../src/modules/store", () => ({
  storeIsReady: jest.fn().mockResolvedValue(true),
  store: {
    data: {
      settings: {
        keepOpenInBackground: true,
        notificationOnNewFiles: true,
        notificationOnMessage: true,
      },
      persistence: {
        sentMessageNotifications: {},
        notificationsHasBeenSent: true,
      },
    },
    write: jest.fn(),
  },
}))

jest.mock("../src/modules/window", () => ({
  send: jest.fn(),
  focus: jest.fn(),
}))

jest.mock("../src/modules/i18next", () => ({
  i18n: {
    getFixedT: () => (key: string) => key,
  },
}))

describe("notifications module", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it("sets up listeners", () => {
    setupNotifications()
    expect(downloadManager.on).toHaveBeenCalledWith(
      "new-files",
      expect.any(Function),
    )
    expect(moodleClient.on).toHaveBeenCalledWith(
      "notifications",
      expect.any(Function),
    )
  })

  it("handles new-files when window send fails (background)", async () => {
    ;(send as jest.Mock).mockReturnValue(false)
    ;(downloadManager.on as jest.Mock).mockImplementation((evt, cb) => {
      if (evt === "new-files") {
        cb({ "Course 1": [{ filename: "test.pdf" }] })
      }
    })

    setupNotifications()
    await Promise.resolve() // wait for next tick

    expect(Notification).toHaveBeenCalled()
    expect(getSyncedItems()).toHaveProperty("Course 1")
    await Promise.resolve() // allow setImmediate inside getSyncedItems to execute
  })

  it("does not show notification if window send succeeds (foreground)", () => {
    ;(send as jest.Mock).mockReturnValue(true)
    ;(downloadManager.on as jest.Mock).mockImplementation((evt, cb) => {
      if (evt === "new-files") {
        cb({ "Course 1": [{ filename: "test.pdf" }] })
      }
    })

    setupNotifications()
    expect(Notification).not.toHaveBeenCalled()
  })

  it("handles moodle notifications and tracks sent status", async () => {
    const mockMoodleNotif = [{ id: 123, read: false, title: "Test MSG" }]
    ;(moodleClient.on as jest.Mock).mockImplementation(async (evt, cb) => {
      if (evt === "notifications") {
        await cb(mockMoodleNotif)
      }
    })

    setupNotifications()

    // Wait for the async callback
    await Promise.resolve()
    await Promise.resolve()

    expect(store.write).toHaveBeenCalled()
    expect(store.data.persistence.sentMessageNotifications[123]).toBeDefined()
    expect(Notification).toHaveBeenCalled()
  })

  it("getNotificationToBeOpened works correctly", () => {
    expect(getNotificationToBeOpened()).toBeNull()
  })
})
