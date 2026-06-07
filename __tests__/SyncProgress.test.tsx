/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-multi-comp */
import React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import "@testing-library/jest-dom"
import { SyncProgress } from "../src/client/views/SyncProgress"
import { ipcRenderer } from "electron"
import { LoginContext } from "../src/client/LoginContext"
import { DownloadState, SyncResult } from "../src/util"

jest.mock("electron", () => {
  let listeners: any = {}
  return {
    ipcRenderer: {
      invoke: jest.fn().mockResolvedValue({}),
      on: jest.fn((channel, cb) => {
        listeners[channel] = cb
      }),
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
  useTranslation: () => ({
    t: (key: string, args?: any) => `${key} ${args?.count ?? ""}`.trim(),
  }),
}))

jest.mock("../src/client/views/NewFilesModal", () => ({
  NewFilesModal: ({ onClose }: any) => (
    <div data-testid="new-files-modal">
      <button data-testid="modal-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}))

jest.mock("../src/client/components/SyncProgressWrap", () => ({
  SyncProgressWrap: ({ progress }: any) => (
    <div data-testid="sync-progress-wrap">{progress.downloaded}</div>
  ),
}))

describe("SyncProgress", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(ipcRenderer as any).clear()
  })

  const renderWithContext = (connected: boolean, isLogged: boolean) => {
    return render(
      <LoginContext.Provider value={{ connected, isLogged } as any}>
        <SyncProgress />
      </LoginContext.Provider>,
    )
  }

  it("renders idle and fetching previously synced items", async () => {
    ;(ipcRenderer.invoke as jest.Mock).mockResolvedValueOnce({
      "Course 1": [{ filename: "file.pdf" }],
    })

    await act(async () => {
      renderWithContext(true, true)
    })

    expect(ipcRenderer.invoke).toHaveBeenCalledWith(
      "get-previously-synced-items",
    )
    expect(screen.getByText("prevNewFiles 1")).toBeInTheDocument()

    // Test View Files button
    fireEvent.click(screen.getByText("viewFiles"))
    expect(screen.getByTestId("new-files-modal")).toBeInTheDocument()

    // Test close modal
    fireEvent.click(screen.getByTestId("modal-close"))
    expect(screen.queryByTestId("new-files-modal")).not.toBeInTheDocument()
  })

  it("shows no connection message", async () => {
    await act(async () => {
      renderWithContext(false, true)
    })
    expect(screen.getByText("noConnection")).toBeInTheDocument()
  })

  it("shows no login message", async () => {
    await act(async () => {
      renderWithContext(true, false)
    })
    expect(screen.getByText("noLogin")).toBeInTheDocument()
  })

  it("handles syncResult success with new files", async () => {
    await act(async () => {
      renderWithContext(true, true)
    })

    act(() => {
      ;(ipcRenderer as any).trigger("sync-result", SyncResult.success)
      ;(ipcRenderer as any).trigger("new-files", {
        "Course 1": [{ filename: "file.pdf" }],
      })
    })

    expect(screen.getByText("newFiles 1")).toBeInTheDocument()

    fireEvent.click(screen.getByText("viewFiles"))
    expect(screen.getByTestId("new-files-modal")).toBeInTheDocument()
  })

  it("handles syncResult error", async () => {
    await act(async () => {
      renderWithContext(true, true)
    })

    act(() => {
      ;(ipcRenderer as any).trigger("sync-result", SyncResult.networkError)
    })

    expect(screen.getByText("resultMessage.networkError")).toBeInTheDocument()
  })

  it("shows downloading state with progress", async () => {
    await act(async () => {
      renderWithContext(true, true)
    })

    act(() => {
      ;(ipcRenderer as any).trigger("download-state", DownloadState.downloading)
      ;(ipcRenderer as any).trigger("progress", { downloaded: 1234 })
    })

    expect(screen.getByTestId("sync-progress-wrap")).toHaveTextContent("1234")
  })

  it("shows generic status message", async () => {
    await act(async () => {
      renderWithContext(true, true)
    })

    act(() => {
      ;(ipcRenderer as any).trigger(
        "download-state",
        DownloadState.fetchingFiles,
      )
    })

    expect(screen.getByText("statusMessage.fetchingFiles")).toBeInTheDocument()
  })
})
