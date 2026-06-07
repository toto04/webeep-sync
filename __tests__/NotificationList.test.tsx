/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react"
import { render, screen, act, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import { NotificationList } from "../src/client/components/NotificationList"
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
}))

jest.mock("../src/client/components/NotificationInfo", () => ({
  NotificationInfo: () => <div data-testid="notification-info" />,
}))

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("NotificationList", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(ipcRenderer as any).clear()
    localStorage.clear()
  })

  it("renders correctly and opens tooltip", async () => {
    ;(ipcRenderer.invoke as jest.Mock).mockImplementation(channel => {
      if (channel === "get-notifications") return Promise.resolve([])
      if (channel === "notification-to-be-opened") return Promise.resolve(null)
      return Promise.resolve(null)
    })

    await act(async () => {
      render(<NotificationList />)
    })

    const icon = document.querySelector(".clickable")
    expect(icon).toBeInTheDocument()

    // open tooltip
    await act(async () => {
      fireEvent.click(icon!)
    })

    expect(screen.getByText("Messaggi da WeBeep")).toBeInTheDocument()
    expect(screen.getByText("no_notifications")).toBeInTheDocument()
  })

  it("handles notifications from IPC", async () => {
    ;(ipcRenderer.invoke as jest.Mock).mockImplementation(channel => {
      if (channel === "get-notifications")
        return Promise.resolve([{ id: 1, read: false, text: "hello" }])
      if (channel === "notification-to-be-opened") return Promise.resolve(null)
      return Promise.resolve(null)
    })

    await act(async () => {
      render(<NotificationList />)
    })

    await act(async () => {
      ;(ipcRenderer as any).trigger("notifications", [
        { id: 1, read: false, text: "hello" },
      ])
    })

    const icon = document.querySelector(".clickable")
    await act(async () => {
      fireEvent.click(icon!)
    })

    expect(screen.getByTestId("notification-info")).toBeInTheDocument()

    // click read all
    await act(async () => {
      fireEvent.click(screen.getByText("setAllRead"))
    })
    expect(ipcRenderer.invoke).toHaveBeenCalledWith(
      "mark-all-notifications-read",
    )
  })

  it("handles notification-to-be-opened", async () => {
    ;(ipcRenderer.invoke as jest.Mock).mockImplementation(channel => {
      if (channel === "get-notifications")
        return Promise.resolve([{ id: 2, read: false, text: "test" }])
      if (channel === "notification-to-be-opened") return Promise.resolve(2)
      return Promise.resolve(null)
    })

    await act(async () => {
      render(<NotificationList />)
    })

    expect(ipcRenderer.invoke).toHaveBeenCalledWith("mark-notification-read", 2)
    expect(screen.getByText("Messaggi da WeBeep")).toBeInTheDocument()
  })
})
