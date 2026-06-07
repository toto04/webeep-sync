/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-multi-comp */
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import { SettingsModal } from "../src/client/views/Settings"
import { ipcRenderer } from "electron"

// Mock electron
jest.mock("electron", () => ({
  ipcRenderer: {
    invoke: jest.fn(),
    send: jest.fn(),
  },
}))

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock components
jest.mock("../src/client/components/Modal", () => ({
  Modal: ({ children, onClose }: any) => (
    <div data-testid="modal">
      <button data-testid="modal-close" onClick={onClose}>
        Close
      </button>
      {children}
    </div>
  ),
}))

jest.mock("../src/client/components/Switch", () => ({
  Switch: () => <div data-testid="switch" />,
}))

jest.mock("../src/client/components/Link", () => ({
  Link: ({ children }: any) => <a>{children}</a>,
}))

jest.mock("../src/client/assets/polinetwork.svg", () => {
  return function MockSvg() {
    return <svg />
  }
})

describe("SettingsModal", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(ipcRenderer.invoke as jest.Mock).mockImplementation(channel => {
      if (channel === "settings") {
        return Promise.resolve({
          language: "en",
          keepOpenInBackground: true,
          trayIcon: true,
          notificationOnNewFiles: true,
          notificationOnMessage: true,
          syncNewCourses: true,
          maxConcurrentDownloads: 5,
        })
      }
      if (channel === "get-native-theme") return Promise.resolve("system")
      if (channel === "version") return Promise.resolve("1.0.0")
      return Promise.resolve()
    })
  })

  it("should preview language and rollback on cancel", async () => {
    const onClose = jest.fn()
    render(<SettingsModal onClose={onClose} />)

    const select = await screen.findByDisplayValue("English")
    expect(select).toBeInTheDocument()

    // Change language to Italian
    fireEvent.change(select, { target: { value: "it" } })

    // Verify it previews the change immediately
    expect(ipcRenderer.send).toHaveBeenCalledWith("set-preview-language", "it")
    ;(ipcRenderer.send as jest.Mock).mockClear()

    // Click cancel button
    const cancelBtn = screen.getByText("cancel")
    fireEvent.click(cancelBtn)

    // Verify rollback
    expect(ipcRenderer.send).toHaveBeenCalledWith("set-preview-language", "en")
    expect(onClose).toHaveBeenCalled()
  })

  it("should rollback on modal close (X button)", async () => {
    const onClose = jest.fn()
    render(<SettingsModal onClose={onClose} />)

    const select = await screen.findByDisplayValue("English")

    // Change language
    fireEvent.change(select, { target: { value: "it" } })
    ;(ipcRenderer.send as jest.Mock).mockClear()

    // Click the modal X button (simulated)
    const closeBtn = screen.getByTestId("modal-close")
    fireEvent.click(closeBtn)

    // Verify rollback
    expect(ipcRenderer.send).toHaveBeenCalledWith("set-preview-language", "en")
    expect(onClose).toHaveBeenCalled()
  })
})
