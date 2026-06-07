/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-multi-comp */
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import { NewFilesModal } from "../src/client/views/NewFilesModal"

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, args?: any) => `${key} ${args?.count ?? ""}`.trim(),
  }),
}))

jest.mock("../src/client/components/Modal", () => ({
  Modal: ({ children, onClose, title }: any) => (
    <div data-testid="modal">
      <h1 data-testid="modal-title">{title}</h1>
      <button data-testid="close-btn" onClick={onClose}>
        Close
      </button>
      {children}
    </div>
  ),
}))

jest.mock("../src/client/components/NewFilesCourseCollapsable", () => ({
  NewFilesCourseCollapsable: ({ name, files }: any) => (
    <div data-testid={`course-${name}`}>
      {files.map((f: any, idx: number) => (
        <span key={idx}>{f.filename}</span>
      ))}
    </div>
  ),
}))

describe("NewFilesModal", () => {
  it("renders with correct count and passes files down", () => {
    const onClose = jest.fn()
    const mockFiles = {
      "Course 1": [
        {
          filename: "file1.pdf",
          filepath: "/1",
          timecreated: 0,
          absolutePath: "/1",
          filesize: 10,
          updated: false,
        },
        {
          filename: "file2.pdf",
          filepath: "/2",
          timecreated: 0,
          absolutePath: "/2",
          filesize: 20,
          updated: false,
        },
      ],
      "Course 2": [
        {
          filename: "file3.pdf",
          filepath: "/3",
          timecreated: 0,
          absolutePath: "/3",
          filesize: 30,
          updated: false,
        },
      ],
    } as any

    render(<NewFilesModal files={mockFiles} onClose={onClose} />)

    // count is 3
    expect(screen.getByTestId("modal-title")).toHaveTextContent("newFiles 3")

    expect(screen.getByTestId("course-Course 1")).toBeInTheDocument()
    expect(screen.getByText("file1.pdf")).toBeInTheDocument()
    expect(screen.getByText("file2.pdf")).toBeInTheDocument()

    expect(screen.getByTestId("course-Course 2")).toBeInTheDocument()
    expect(screen.getByText("file3.pdf")).toBeInTheDocument()

    // Test close
    fireEvent.click(screen.getByTestId("close-btn"))
    expect(onClose).toHaveBeenCalled()
  })

  it("handles empty files object", () => {
    render(<NewFilesModal files={{}} onClose={jest.fn()} />)
    expect(screen.getByTestId("modal-title")).toHaveTextContent("newFiles 0")
  })
})
