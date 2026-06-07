/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-multi-comp */
import React from "react"
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { MainView } from "../src/client/views/MainView"
import { LoginContext } from "../src/client/LoginContext"
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
      off: (channel: string, cb: any) => {
        delete listeners[channel]
      },
      clear: () => {
        listeners = {}
      },
    },
  }
})

jest.mock("react-i18next", () => {
  const listeners: any = {}
  const i18n = {
    getFixedT: () => (key: string, args: any) =>
      `${key} ${args?.count ?? ""}`.trim(),
    on: (evt: string, cb: any) => {
      listeners[evt] = cb
    },
    off: (evt: string, cb: any) => {
      delete listeners[evt]
    },
    trigger: (evt: string) => {
      if (listeners[evt]) listeners[evt]()
    },
  }
  return {
    useTranslation: () => ({
      t: (key: string) => key,
      i18n,
    }),
  }
})

jest.mock("../src/client/components/NotificationList", () => ({
  NotificationList: () => <div data-testid="notification-list" />,
}))

jest.mock("react-icons/io5", () => ({
  IoSettingsSharp: ({ onClick }: any) => (
    <div data-testid="settings-icon" onClick={onClick} />
  ),
  IoWarning: () => <div data-testid="warning-icon" />,
  IoRefreshCircle: () => <div data-testid="refresh-icon" />,
}))

describe("MainView", () => {
  const onLogin = jest.fn()
  const onSettings = jest.fn()

  const renderWithContext = async (contextVal: any) => {
    let result: any
    await act(async () => {
      result = render(
        <LoginContext.Provider value={contextVal}>
          <MainView onLogin={onLogin} onSettings={onSettings} />
        </LoginContext.Provider>,
      )
      await Promise.resolve()
      await Promise.resolve()
    })
    return result
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(ipcRenderer as any).clear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly and fetches lastsynced time", async () => {
    ;(ipcRenderer.invoke as jest.Mock).mockResolvedValue(
      Date.now() - 1000 * 60 * 5,
    ) // 5 minutes ago

    await renderWithContext({
      isLogged: true,
      username: "testuser",
      syncing: false,
      connected: true,
    })

    expect(ipcRenderer.invoke).toHaveBeenCalledWith("lastsynced")

    await waitFor(() => {
      expect(screen.getByText("minute 5")).toBeInTheDocument()
    })

    expect(screen.getByText("testuser")).toBeInTheDocument()
    expect(screen.getByText("sync")).toBeInTheDocument()

    // Start sync
    fireEvent.click(screen.getByText("sync"))
    expect(ipcRenderer.send).toHaveBeenCalledWith("sync-start")

    // Open settings
    fireEvent.click(screen.getByTestId("settings-icon"))
    expect(onSettings).toHaveBeenCalled()
  })

  it("handles syncing state and stop sync", async () => {
    await renderWithContext({
      isLogged: true,
      username: "testuser",
      syncing: true,
      connected: true,
    })

    const stopBtn = screen.getByText("stop")
    expect(stopBtn).toBeInTheDocument()

    fireEvent.click(stopBtn)
    expect(ipcRenderer.send).toHaveBeenCalledWith("sync-stop")
  })

  it("handles not logged in state and login click", async () => {
    await renderWithContext({
      isLogged: false,
      syncing: false,
      connected: true,
    })

    const loginText = screen.getByText("login")
    fireEvent.click(loginText)
    expect(onLogin).toHaveBeenCalled()
  })

  it("shows update available icon and handles click", async () => {
    await renderWithContext({
      isLogged: true,
      username: "test",
      syncing: false,
      connected: true,
    })

    // trigger update available
    act(() => {
      ;(ipcRenderer as any).trigger("update-available")
    })

    const updateIcon = screen.getByTitle("updateAvailable")
    fireEvent.click(updateIcon)
    expect(ipcRenderer.invoke).toHaveBeenCalledWith("quit-and-install")
  })

  it("shows not connected warning", async () => {
    await renderWithContext({
      isLogged: true,
      username: "test",
      syncing: false,
      connected: false,
    })

    expect(screen.getByTestId("warning-icon")).toBeInTheDocument()
  })
})
