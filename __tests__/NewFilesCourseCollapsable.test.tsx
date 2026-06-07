/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import { NewFilesCourseCollapsable } from "../src/client/components/NewFilesCourseCollapsable"
import { shell } from "electron"

jest.mock("electron", () => ({
  shell: {
    showItemInFolder: jest.fn(),
    openPath: jest.fn(),
  },
}))

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

jest.mock("../src/util", () => ({
  formatSize: (size: number) => `SIZE_${size}`,
  breakableString: (str: string) => str,
}))

describe("NewFilesCourseCollapsable", () => {
  const mockFiles = [
    {
      filename: "file1.pdf",
      absolutePath: "/path/to/file1.pdf",
      filesize: 1024,
      updated: false,
    },
    {
      filename: "file2.doc",
      absolutePath: "/path/to/file2.doc",
      filesize: 2048,
      updated: true,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders open by default with file list", () => {
    render(
      <NewFilesCourseCollapsable name="Math 101" files={mockFiles as any} />,
    )

    expect(screen.getByText("Math 101 (2)")).toBeInTheDocument()
    expect(screen.getByText("file1.pdf")).toBeInTheDocument()
    expect(screen.getByText("file2.doc")).toBeInTheDocument()
    expect(screen.getByText("SIZE_1024")).toBeInTheDocument()
    expect(screen.getByText("SIZE_2048")).toBeInTheDocument()
  })

  it("toggles file list on click", () => {
    render(
      <NewFilesCourseCollapsable name="Math 101" files={mockFiles as any} />,
    )

    // Initially files are shown
    expect(screen.getByText("file1.pdf")).toBeInTheDocument()

    // Click to collapse
    const header = screen.getByText("Math 101 (2)")
    fireEvent.click(header)

    // Files should be hidden
    expect(screen.queryByText("file1.pdf")).not.toBeInTheDocument()

    // Click to reopen
    fireEvent.click(header)
    expect(screen.getByText("file1.pdf")).toBeInTheDocument()
  })

  it("opens file and reveals in folder", () => {
    render(
      <NewFilesCourseCollapsable
        name="Math 101"
        files={[mockFiles[0]] as any}
      />,
    )

    const revealBtn = screen.getByText("reveal")
    fireEvent.click(revealBtn)
    expect(shell.showItemInFolder).toHaveBeenCalledWith("/path/to/file1.pdf")

    const openBtn = screen.getByText("open")
    fireEvent.click(openBtn)
    expect(shell.openPath).toHaveBeenCalledWith("/path/to/file1.pdf")
  })
})
