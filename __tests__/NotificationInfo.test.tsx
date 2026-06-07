/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-multi-comp */
import React from "react"
import { render, screen, act, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import { NotificationInfo } from "../src/client/components/NotificationInfo"
import { ipcRenderer, shell } from "electron"

jest.mock("electron", () => ({
  ipcRenderer: {
    invoke: jest.fn().mockResolvedValue(null),
  },
  shell: {
    openExternal: jest.fn(),
  },
}))

jest.mock("../src/client/components/Modal", () => ({
  Modal: ({ children, title, onClose }: any) => (
    <div data-testid="modal">
      <h2>{title}</h2>
      <button onClick={onClose}>Close</button>
      {children}
    </div>
  ),
}))

jest.mock("../src/client/components/Link", () => ({
  Link: ({ children, href }: any) => (
    <a href={href} data-testid="link">
      {children}
    </a>
  ),
}))

describe("NotificationInfo", () => {
  const mockNotification = {
    id: 1,
    title: "Test Notification",
    read: false,
    htmlbody: `
      <div class="forum-post">
        <div class="header">
          <div class="picture">Pic</div>
        </div>
        <a class="link" href="#">Link</a>
        <div class="commands">Commands</div>
        <div class="content"><p>Some text</p><a href="http://test.com">Test Link</a></div>
      </div>
    `,
    url: "http://example.com",
    timecreated: 1622548800,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly and opens modal", async () => {
    const onShow = jest.fn()

    await act(async () => {
      render(
        <NotificationInfo
          notification={mockNotification as any}
          toBeOpened={false}
          onShow={onShow}
        />,
      )
    })

    expect(screen.getByText("Test Notification")).toBeInTheDocument()

    // open modal
    await act(async () => {
      fireEvent.click(document.querySelector(".notification")!)
    })

    expect(ipcRenderer.invoke).toHaveBeenCalledWith("mark-notification-read", 1)
    expect(onShow).toHaveBeenCalled()
    expect(screen.getByTestId("modal")).toBeInTheDocument()

    // check link click
    const link = document.querySelector(".content a")
    await act(async () => {
      fireEvent.click(link!)
    })
    expect(shell.openExternal).toHaveBeenCalledWith("http://test.com/")

    // close modal
    await act(async () => {
      fireEvent.click(screen.getByText("Close"))
    })
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument()
  })

  it("handles missing elements gracefully", async () => {
    const notification = {
      ...mockNotification,
      htmlbody: `
        <div class="forum-post">
        </div>
      `,
    }

    await act(async () => {
      render(
        <NotificationInfo
          notification={notification as any}
          toBeOpened={true}
        />,
      )
    })

    expect(screen.getByTestId("modal")).toBeInTheDocument()
  })
})
