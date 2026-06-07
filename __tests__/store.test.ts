/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("electron", () => ({
  nativeTheme: { themeSource: "system" },
  app: {
    getPath: jest.fn().mockReturnValue("/mock/path"),
    getLocaleCountryCode: jest.fn().mockReturnValue("IT"),
  },
}))

jest.mock("fs/promises", () => ({
  __esModule: true,
  default: {
    rename: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
    open: jest.fn().mockResolvedValue({
      write: jest.fn().mockResolvedValue(undefined),
    }),
  },
}))

jest.mock("lowdb", () => {
  return {
    Low: class MockLow {
      data: any
      read = jest.fn().mockResolvedValue(undefined)
      write = jest.fn().mockResolvedValue(undefined)
      constructor(adapter: any, defaultData: any) {
        this.data = defaultData
      }
    },
  }
})

jest.mock("lowdb/node", () => ({
  JSONFile: class MockJSONFile {},
}))

import { storeIsReady, store } from "../src/modules/store"

describe("Store", () => {
  it("initializes store and populates default settings", async () => {
    await storeIsReady()
    expect(store.data.settings).toBeDefined()
    expect(store.data.settings.language).toBe("it")
    expect(store.data.settings.autosyncEnabled).toBe(true)
    expect(store.data.settings.syncNewCourses).toBe(true)
  })

  it("checks store integrity for persistence courses", async () => {
    store.data.persistence = {
      courses: {
        "123": { name: "Software Engineering", shouldSync: true },
      },
      sentMessageNotifications: {},
    }

    await storeIsReady()
    expect(store.data.persistence.courses["123"]).toBeDefined()
    expect(store.data.persistence.courses["123"].name).toBe(
      "Software Engineering",
    )
  })
})
