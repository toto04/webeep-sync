/* eslint-disable @typescript-eslint/no-explicit-any */
import { DownloadManager } from "../src/modules/download"
import { store } from "../src/modules/store"
import { SyncResult } from "../src/util"
import fs from "fs/promises"

jest.mock("fs", () => ({
  createWriteStream: jest.fn().mockReturnValue({}),
}))

jest.mock("fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  utimes: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({ mtime: new Date(1000), size: 100 }),
  rm: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("stream/promises", () => ({
  pipeline: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("got", () => {
  const HTTPError = class extends Error {
    response: any
    constructor(resp: any) {
      super()
      this.name = "HTTPError"
      this.response = resp
    }
  }
  return {
    stream: jest.fn().mockReturnValue({
      on: jest.fn(),
    }),
    HTTPError,
  }
})

jest.mock("../src/modules/logger", () => ({
  createLogger: () => ({ log: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}))

jest.mock("../src/modules/store", () => ({
  store: {
    data: {
      settings: {
        autosyncEnabled: false,
        autosyncInterval: 60000,
        downloadPath: "/downloads",
        maxConcurrentDownloads: 1,
      },
      persistence: {
        lastSynced: 0,
        courses: {
          1: { shouldSync: true },
          2: { shouldSync: false },
        },
      },
    },
    write: jest.fn(),
  },
  storeIsReady: jest.fn().mockResolvedValue(true),
}))

jest.mock("../src/modules/login", () => ({
  loginManager: {
    token: "test-token",
  },
}))

jest.mock("../src/modules/moodle", () => ({
  moodleClient: {
    getCoursesWithoutCache: jest.fn().mockResolvedValue([
      { id: 1, name: "Course 1", shouldSync: true },
      { id: 2, name: "Course 2", shouldSync: false },
    ]),
    getFileInfos: jest.fn().mockImplementation(() =>
      Promise.resolve([
        {
          coursename: "Course 1",
          filename: "test.pdf",
          filepath: "/",
          filesize: 200,
          fileurl: "http://test.pdf",
          timemodified: 2,
        },
      ]),
    ),
  },
}))

beforeAll(() => {
  jest.useFakeTimers()
})

afterAll(() => {
  jest.useRealTimers()
})

describe("DownloadManager", () => {
  let downloadManager: DownloadManager

  beforeEach(() => {
    jest.clearAllMocks()
    downloadManager = new DownloadManager()
  })

  it("should initialize and set autosync", async () => {
    await downloadManager.setAutosync(true)
    expect(store.data.settings.autosyncEnabled).toBe(true)
    expect(store.write).toHaveBeenCalled()
  })

  it("getFilesToDownload should fetch courses and return modified files", async () => {
    const files = await downloadManager.getFilesToDownload()
    expect(files).toHaveLength(1)
    expect(files[0].filename).toBe("test.pdf")
    expect(files[0].updating).toBe(true)
  })

  it("getFilesToDownload should return files if fs.stat throws (new file)", async () => {
    ;(fs.stat as jest.Mock).mockRejectedValueOnce(new Error("ENOENT"))
    const files = await downloadManager.getFilesToDownload()
    expect(files).toHaveLength(1)
    expect(files[0].updating).toBeUndefined()
  })

  it("sync should download files and return success", async () => {
    const stopHandler = jest.fn()
    downloadManager.on("stop", stopHandler)

    const result = await downloadManager.sync()
    expect(result).toBe(true)
    expect(stopHandler).toHaveBeenCalledWith(SyncResult.success)
  })

  it("stop should cancel requests and set stopped to true", () => {
    const cancelMock = jest.fn()
    downloadManager.currentDownloads = [
      { cancel: cancelMock, progress: {} as any },
    ]
    downloadManager.stop()
    expect((downloadManager as any).stopped).toBe(true)
    expect(cancelMock).toHaveBeenCalled()
  })

  it("getCurrentProgress should return null when idle", () => {
    expect(downloadManager.getCurrentProgress()).toBeNull()
  })

  it("should ignore already syncing", async () => {
    downloadManager.syncing = true
    expect(await downloadManager.sync()).toBe(false)
  })
})
