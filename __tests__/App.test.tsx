/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-multi-comp */
import React from "react"
import { render, screen, act } from "@testing-library/react"
import "@testing-library/jest-dom"
import { App } from "../src/client/App"
import { ipcRenderer } from "electron"

jest.mock("electron", () => {
  let listeners: any = {}
  return {
    ipcRenderer: {
      invoke: jest.fn().mockResolvedValue(null),
      on: jest.fn((channel, cb) => {
        listeners[channel] = cb
      }),
      send: jest.fn(),
      trigger: (channel: string, ...args: any[]) => {
        if (listeners[channel]) listeners[channel]({} as any, ...args)
      },
      clear: () => {
        listeners = {}
      },
    },
  }
})

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  I18nextProvider: ({ children }: any) => <>{children}</>,
  initReactI18next: { type: "3rdParty", init: jest.fn() },
}))

jest.mock("i18next", () => {
  const i18n = {
    use: jest.fn().mockReturnThis(),
    init: jest.fn(),
    hasResourceBundle: jest.fn(),
    addResourceBundle: jest.fn(),
    changeLanguage: jest.fn(),
  }
  return i18n
})

jest.mock("../src/client/views/MainView", () => ({
  MainView: () => <div data-testid="main-view" />,
}))

jest.mock("../src/client/views/SyncSettings", () => ({
  SyncSettings: () => <div data-testid="sync-settings" />,
}))

jest.mock("../src/client/views/Settings", () => ({
  SettingsModal: () => <div data-testid="settings-modal" />,
}))

jest.mock("../src/client/views/CourseList", () => ({
  CourseList: () => <div data-testid="course-list" />,
}))

jest.mock("../src/client/views/SyncProgress", () => ({
  SyncProgress: () => <div data-testid="sync-progress" />,
}))

describe("App", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(ipcRenderer as any).clear()
  })

  it("renders correctly and sets up ipc listeners", async () => {
    await act(async () => {
      render(<App />)
    })

    expect(screen.getByText("WeBeep Sync")).toBeInTheDocument()
    expect(screen.getByTestId("main-view")).toBeInTheDocument()
    expect(screen.getByTestId("sync-settings")).toBeInTheDocument()
    expect(screen.getByTestId("sync-progress")).toBeInTheDocument()

    expect(ipcRenderer.send).toHaveBeenCalledWith("get-context")

    // trigger network
    act(() => {
      ;(ipcRenderer as any).trigger("network_event", true)
    })

    // trigger syncing
    act(() => {
      ;(ipcRenderer as any).trigger("syncing", true)
    })

    // trigger username
    act(() => {
      ;(ipcRenderer as any).trigger("username", "testuser")
    })
  })

  it("shows CourseList when logged in and courses are available", async () => {
    await act(async () => {
      render(<App />)
    })

    act(() => {
      ;(ipcRenderer as any).trigger("is-logged", true, "test", false)
      ;(ipcRenderer as any).trigger("courses", [{ id: 1, name: "course1" }])
    })

    expect(screen.getByTestId("course-list")).toBeInTheDocument()
  })

  it("handles language event", async () => {
    await act(async () => {
      render(<App />)
    })

    const i18next = require("i18next")
    i18next.hasResourceBundle.mockReturnValue(false)

    await act(async () => {
      ;(ipcRenderer as any).trigger("language", { lng: "it", bundle: {} })
    })

    expect(i18next.addResourceBundle).toHaveBeenCalledWith("it", "client", {})
    expect(i18next.changeLanguage).toHaveBeenCalledWith("it")
  })
})
