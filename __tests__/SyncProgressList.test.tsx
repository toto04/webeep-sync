/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-multi-comp */
import React from "react"
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { SyncProgressList } from "../src/client/components/SyncProgressList"

jest.mock("react-icons/io5", () => ({
  IoEllipsisHorizontal: ({ onClick, className }: any) => (
    <div data-testid="ellipsis" className={className} onClick={onClick} />
  ),
}))

jest.mock("../src/client/components/ProgressBar", () => ({
  PrograssBar: ({ progress }: any) => (
    <div data-testid="progress-bar">{progress}</div>
  ),
}))

jest.mock("../src/util", () => ({
  breakableString: (str: string) => str,
  formatSize: (size: number) => `SIZE_${size}`,
}))

describe("SyncProgressList", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it("shows tooltip on mouse over and click, hides on mouse out", async () => {
    const files = [
      { filename: "file1", absolutePath: "/f1", downloaded: 10, total: 10 },
      { filename: "file2", absolutePath: "/f2", downloaded: 5, total: 10 },
    ]

    const { container } = render(<SyncProgressList files={files as any} />)
    const listWrapper = container.firstChild as HTMLElement

    // Initially hidden
    expect(screen.queryByText("file2")).not.toBeInTheDocument()

    // Mouse over shows tooltip
    fireEvent.mouseOver(listWrapper)
    expect(screen.getByText("file2")).toBeInTheDocument()

    // Contains file size info and percentages
    expect(screen.getByText("SIZE_5/SIZE_10")).toBeInTheDocument()
    expect(screen.getByText("50%")).toBeInTheDocument()

    // The first file is filtered out
    expect(screen.queryByText("file1")).not.toBeInTheDocument()

    // Mouse out hides tooltip after timeout
    fireEvent.mouseOut(listWrapper)
    act(() => {
      jest.advanceTimersByTime(25)
    })

    await waitFor(() => {
      expect(screen.queryByText("file2")).not.toBeInTheDocument()
    })

    // Click ellipsis also shows tooltip
    fireEvent.click(screen.getByTestId("ellipsis"))
    expect(screen.getByText("file2")).toBeInTheDocument()
  })
})
