/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import "@testing-library/jest-dom"
import { SyncSettings } from "../src/client/views/SyncSettings"
import { ipcRenderer, shell } from "electron"

jest.mock("electron", () => {
  let listeners: any = {}
  return {
    ipcRenderer: {
      on: jest.fn((channel, cb) => {
        listeners[channel] = cb
      }),
      send: jest.fn(),
      // helper to trigger events in test
      trigger: (channel: string, ...args: any[]) => {
        if (listeners[channel]) listeners[channel]({} as any, ...args)
      },
      clear: () => {
        listeners = {}
      },
    },
    shell: {
      openPath: jest.fn(),
    },
  }
})

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

jest.mock("../src/client/components/Switch", () => ({
  Switch: ({ onChange, checked }: any) => (
    <input
      type="checkbox"
      data-testid="switch"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
    />
  ),
}))

jest.mock("../src/util", () => ({
  breakableString: (str: string) => str,
}))

describe("SyncSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(ipcRenderer as any).clear()
  })

  it("renders correctly and fetches initial state", () => {
    render(<SyncSettings />)
    expect(ipcRenderer.send).toHaveBeenCalledWith("sync-settings")
  })

  it("updates path and can open/edit it", () => {
    render(<SyncSettings />)

    act(() => {
      ;(ipcRenderer as any).trigger("download-path", "/my/mock/path")
    })

    expect(screen.getByText("/my/mock/path")).toBeInTheDocument()

    // Test open
    const openBtn = screen.getByText("open")
    fireEvent.click(openBtn)
    expect(shell.openPath).toHaveBeenCalledWith("/my/mock/path")

    // Test edit
    const editBtn = screen.getByText("edit")
    fireEvent.click(editBtn)
    expect(ipcRenderer.send).toHaveBeenCalledWith("select-download-path")
  })

  it("updates autosync and syncInterval", () => {
    render(<SyncSettings />)

    act(() => {
      ;(ipcRenderer as any).trigger("autosync", true)
      ;(ipcRenderer as any).trigger("autosync-interval", 7200000) // 2 hours
    })

    const switchEl = screen.getByTestId("switch")
    expect(switchEl).toBeChecked()

    const selectEl = screen.getByRole("combobox")
    expect(selectEl).toHaveValue("2")
  })

  it("can toggle autosync and change interval", () => {
    render(<SyncSettings />)

    act(() => {
      ;(ipcRenderer as any).trigger("autosync", true)
    })

    const switchEl = screen.getByTestId("switch")
    fireEvent.click(switchEl) // toggles off
    expect(ipcRenderer.send).toHaveBeenCalledWith("set-autosync", false)

    const selectEl = screen.getByRole("combobox")
    fireEvent.change(selectEl, { target: { value: "8" } })
    expect(ipcRenderer.send).toHaveBeenCalledWith(
      "set-autosync-interval",
      8 * 60 * 60 * 1000,
    )
  })
})
