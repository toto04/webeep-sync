/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-multi-comp */
import React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import "@testing-library/jest-dom"
import { CourseRow } from "../src/client/components/CourseRow"
import { ipcRenderer } from "electron"

jest.mock("electron", () => ({
  ipcRenderer: {
    send: jest.fn(),
    invoke: jest.fn().mockResolvedValue(true),
  },
}))

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

jest.mock("../src/client/components/Checkbox", () => ({
  Checkbox: ({ value, onChange }: any) => (
    <input
      type="checkbox"
      data-testid="checkbox"
      checked={value}
      onChange={e => onChange(e.target.checked)}
    />
  ),
}))

jest.mock("react-icons/io5", () => ({
  IoClose: ({ onClick }: any) => (
    <div data-testid="close-icon" onClick={onClick} />
  ),
  IoAddCircleOutline: () => <div />,
  IoCheckmarkCircle: () => <div />,
}))
jest.mock("react-icons/hi", () => ({
  HiCheck: ({ onClick }: any) => (
    <div data-testid="check-icon" onClick={onClick} />
  ),
}))

describe("CourseRow", () => {
  const mockCourse = {
    id: 123,
    name: "math101",
    fullname: "Mathematics 101",
    shouldSync: true,
    url: "http://example.com",
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly", () => {
    render(<CourseRow course={mockCourse as any} index={0} length={1} />)

    expect(screen.getByText("Mathematics 101")).toBeInTheDocument()
    const input = screen.getByDisplayValue("math101")
    expect(input).toBeInTheDocument()
    expect(input).not.toHaveClass("editing")
  })

  it("can toggle shouldSync", () => {
    render(<CourseRow course={mockCourse as any} index={0} length={1} />)
    const checkbox = screen.getByTestId("checkbox")

    fireEvent.click(checkbox)
    expect(ipcRenderer.send).toHaveBeenCalledWith("set-should-sync", 123, false)
  })

  it("handles editing and cancel via escape", () => {
    render(<CourseRow course={mockCourse as any} index={0} length={1} />)
    const input = screen.getByDisplayValue("math101")

    // Focus sets editing mode
    fireEvent.focus(input)
    expect(input).toHaveClass("editing")

    // Type something
    fireEvent.change(input, { target: { value: "math101-new" } })
    expect(input).toHaveValue("math101-new")

    // Escape cancels
    fireEvent.keyDown(input, { key: "Escape" })
    expect(input).toHaveValue("math101")
    expect(input).not.toHaveClass("editing")
  })

  it("handles editing and confirm via enter", async () => {
    render(<CourseRow course={mockCourse as any} index={0} length={1} />)
    const input = screen.getByDisplayValue("math101")

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "math101-new" } })

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" })
    })

    expect(ipcRenderer.invoke).toHaveBeenCalledWith(
      "rename-course",
      123,
      "math101-new",
    )
    expect(input).not.toHaveClass("editing")
  })

  it("handles invalid input", async () => {
    render(<CourseRow course={mockCourse as any} index={0} length={1} />)
    const input = screen.getByDisplayValue("math101")

    fireEvent.focus(input)
    // Invalid characters
    fireEvent.change(input, { target: { value: "math:101" } })

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" })
    })

    expect(ipcRenderer.invoke).not.toHaveBeenCalled()
  })

  it("handles confirm via check icon", async () => {
    render(<CourseRow course={mockCourse as any} index={0} length={1} />)
    const input = screen.getByDisplayValue("math101")

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "math102" } })

    const checkIcon = screen.getByTestId("check-icon")
    await act(async () => {
      fireEvent.click(checkIcon)
    })

    expect(ipcRenderer.invoke).toHaveBeenCalledWith(
      "rename-course",
      123,
      "math102",
    )
  })

  it("handles error during rename", async () => {
    ;(ipcRenderer.invoke as jest.Mock).mockResolvedValueOnce(false)

    render(<CourseRow course={mockCourse as any} index={0} length={1} />)
    const input = screen.getByDisplayValue("math101")

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "math102" } })

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" })
    })

    // Editing mode should remain because it failed
    expect(input).toHaveClass("editing")
  })
})
