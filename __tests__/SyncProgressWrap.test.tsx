/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-multi-comp */
import React from "react"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import { SyncProgressWrap } from "../src/client/components/SyncProgressWrap"

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

jest.mock("../src/util", () => ({
  formatSize: (size: number) => `SIZE_${size}`,
  breakableString: (str: string) => str,
}))

jest.mock("../src/client/components/ProgressBar", () => ({
  PrograssBar: ({ progress }: any) => (
    <div data-testid="progress-bar">{progress}</div>
  ),
}))

jest.mock("../src/client/components/SyncProgressList", () => ({
  SyncProgressList: () => <div data-testid="sync-progress-list" />,
}))

describe("SyncProgressWrap", () => {
  const mockProgress = {
    downloaded: 50,
    total: 100,
    files: [
      {
        filename: "file1.txt",
        absolutePath: "/path/file1.txt",
        downloaded: 10,
        total: 20,
      },
    ],
  }

  it("renders progress bars correctly with single file", () => {
    render(<SyncProgressWrap progress={mockProgress as any} />)

    expect(screen.queryByTestId("sync-progress-list")).not.toBeInTheDocument()

    expect(screen.getByText("file1.txt")).toBeInTheDocument()
    expect(screen.getByText("/path/file1.txt")).toBeInTheDocument()
    expect(screen.getByText("SIZE_10 / SIZE_20 (50%)")).toBeInTheDocument()
    expect(screen.getByText("SIZE_50 / SIZE_100 (50%)")).toBeInTheDocument()
  })

  it("renders SyncProgressList when multiple files exist", () => {
    const multiFilesProgress = {
      ...mockProgress,
      files: [
        mockProgress.files[0],
        {
          filename: "file2.txt",
          absolutePath: "/path/file2.txt",
          downloaded: 0,
          total: 10,
        },
      ],
    }

    render(<SyncProgressWrap progress={multiFilesProgress as any} />)
    expect(screen.getByTestId("sync-progress-list")).toBeInTheDocument()
  })
})
