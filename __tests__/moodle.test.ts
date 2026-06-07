/* eslint-disable @typescript-eslint/no-explicit-any */
import { MoodleClient } from "../src/modules/moodle"
import { loginManager } from "../src/modules/login"
import got from "got"
import { store } from "../src/modules/store"

jest.mock("got", () => ({
  post: jest.fn(),
}))

jest.mock("../src/modules/login", () => {
  const events = require("events")
  const emitter = new events.EventEmitter()
  ;(emitter as any).isLogged = true
  ;(emitter as any).token = "test-token"
  ;(emitter as any).createLoginWindow = jest.fn().mockResolvedValue(true)
  return {
    loginManager: emitter,
  }
})

jest.mock("../src/modules/store", () => ({
  store: {
    data: {
      settings: {
        syncNewCourses: true,
        downloadPath: "/downloads",
      },
      persistence: {
        courses: {},
      },
    },
    write: jest.fn(),
  },
  storeIsReady: jest.fn().mockResolvedValue(true),
}))

jest.mock("../src/modules/logger", () => ({
  createLogger: () => ({ log: jest.fn(), debug: jest.fn() }),
}))

// Timer mocks to prevent setInterval from running indefinitely
beforeAll(() => {
  jest.useFakeTimers()
})

afterAll(() => {
  jest.useRealTimers()
})

describe("MoodleClient", () => {
  let moodleClient: MoodleClient

  beforeEach(() => {
    jest.clearAllMocks()
    ;(loginManager as any).isLogged = true
    ;(loginManager as any).token = "test-token"
    moodleClient = new MoodleClient()
  })

  it("should initialize and fetch user ID correctly", async () => {
    ;(got.post as jest.Mock).mockResolvedValueOnce({
      body: JSON.stringify({ userid: 123, fullname: "Test User" }),
    })

    const usernameHandler = jest.fn()
    moodleClient.on("username", usernameHandler)

    await moodleClient.getUserID()

    expect(moodleClient.userid).toBe(123)
    expect(moodleClient.username).toBe("Test User")
    expect(usernameHandler).toHaveBeenCalledWith("Test User")
    expect(got.post).toHaveBeenCalled()
  })

  it("should handle call network error with catchNetworkError = false", async () => {
    ;(got.post as jest.Mock).mockRejectedValueOnce(new Error("Network Error"))

    await expect(moodleClient.call("test_function", {}, false)).rejects.toThrow(
      "Network Error",
    )
    expect(moodleClient.connected).toBe(false)
  })

  it("should retry call on network error if catchNetworkError = true", async () => {
    let callCount = 0
    ;(got.post as jest.Mock).mockImplementation(() => {
      callCount++
      if (callCount === 1) return Promise.reject(new Error("Network Error"))
      return Promise.resolve({ body: JSON.stringify({ success: true }) })
    })

    const promise = moodleClient.call("test_function", {}, true)

    // Advance timers for setTimeout in retry
    await Promise.resolve() // let rejection happen
    jest.advanceTimersByTime(2000)

    const result = await promise
    expect(result).toEqual({ success: true })
    expect(moodleClient.connected).toBe(true)
  })

  it("should request new token if invalidtoken", async () => {
    let callCount = 0
    ;(got.post as jest.Mock).mockImplementation(() => {
      callCount++
      if (callCount === 1)
        return Promise.resolve({
          body: JSON.stringify({ errorcode: "invalidtoken" }),
        })
      return Promise.resolve({ body: JSON.stringify({ success: true }) })
    })

    const result = await moodleClient.call("test_function", {}, true)
    expect(loginManager.createLoginWindow).toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })

  it("getCoursesWithoutCache should return formatted courses", async () => {
    moodleClient.userid = 123
    ;(got.post as jest.Mock).mockResolvedValueOnce({
      body: JSON.stringify([
        { id: 1, fullname: "2023 - Intro to CS (Course)" },
        { id: 2, fullname: "Just Another Course" },
      ]),
    })

    const courses = await moodleClient.getCoursesWithoutCache()
    expect(courses).toHaveLength(2)
    expect(courses[0].id).toBe(1)
    expect(courses[0].name).toBe("Intro to CS")
    expect(courses[1].name).toBe("Just Another Course")
    expect(store.data.persistence.courses[1]).toBeDefined()
    expect(store.write).toHaveBeenCalled()
  })

  it("getFileInfos should extract file infos from contents", async () => {
    const mockContents = [
      {
        id: 1,
        name: "Week 1",
        modules: [
          {
            id: 1,
            name: "Resource 1",
            modname: "resource",
            contents: [
              {
                type: "file",
                filename: "doc.pdf",
                filepath: "/",
                filesize: 100,
                fileurl: "http://example.com/doc.pdf",
                timecreated: 1,
                timemodified: 2,
              },
            ],
          },
          {
            id: 2,
            name: "Forum Link",
            modname: "forum", // Should be ignored (EXCLUDED_MODNAMES)
            contents: [],
          },
        ],
      },
    ]

    ;(got.post as jest.Mock).mockResolvedValueOnce({
      body: JSON.stringify(mockContents),
    })

    const course = {
      id: 1,
      fullname: "Test",
      name: "TestCourse",
      shouldSync: true,
    }
    const files = await moodleClient.getFileInfos(course)

    expect(files).toHaveLength(1)
    expect(files[0].coursename).toBe("TestCourse")
    expect(files[0].filename).toBe("Resource 1.pdf") // since modname resource and 1 file
    expect(got.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        form: expect.objectContaining({
          wsfunction: "core_course_get_contents",
        }),
      }),
    )
  })

  it("getNotifications should return and filter notifications", async () => {
    const mockNots = {
      notifications: [
        {
          id: 1,
          subject: "Title",
          fullmessagehtml: "<p>body</p>",
          contexturl: "http://example.com",
          timecreated: 123,
          read: false,
          eventtype: "posts",
          customdata: JSON.stringify({ courseid: 5 }),
        },
        {
          id: 2,
          subject: "Title 2",
          fullmessagehtml: "<p>body 2</p>",
          contexturl: "http://example.com",
          timecreated: 123,
          read: false,
          eventtype: "other", // Should be filtered
          customdata: "",
        },
      ],
    }

    ;(got.post as jest.Mock).mockResolvedValueOnce({
      body: JSON.stringify(mockNots),
    })

    const nots = await moodleClient.getNotifications()
    expect(nots).toHaveLength(1)
    expect(nots[0].title).toBe("Title")
    expect(nots[0].courseid).toBe(5)
  })

  it("markNotificationAsRead should update cache and send request", async () => {
    moodleClient.cachedNotifications = [{ id: 1, read: false } as any]
    ;(got.post as jest.Mock).mockResolvedValueOnce({
      body: JSON.stringify({ success: true }),
    })

    await moodleClient.markNotificationAsRead(1)
    expect(moodleClient.cachedNotifications[0].read).toBe(true)
    expect(got.post).toHaveBeenCalled()
  })

  it("markAllNotificationsAsRead should update cache and send request", async () => {
    moodleClient.cachedNotifications = [{ id: 1, read: false } as any]
    moodleClient.userid = 123
    ;(got.post as jest.Mock).mockResolvedValueOnce({
      body: JSON.stringify({ success: true }),
    })

    await moodleClient.markAllNotificationsAsRead()
    expect(moodleClient.cachedNotifications[0].read).toBe(true)
    expect(got.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        form: expect.objectContaining({
          wsfunction: "core_message_mark_all_notifications_as_read",
          useridto: 123,
        }),
      }),
    )
  })
})
