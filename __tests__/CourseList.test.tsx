/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import { CourseList } from "../src/client/views/CourseList"
import { ipcRenderer } from "electron"
import { Course } from "../src/modules/moodle"

// Mock electron
jest.mock("electron", () => ({
  ipcRenderer: {
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
jest.mock("../src/client/components/CourseRow", () => ({
  CourseRow: ({ course }: any) => (
    <div data-testid={`course-${course.id}`}>{course.name}</div>
  ),
}))

describe("CourseList", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should show selectAll when not all courses are synced", () => {
    const courses = [
      { id: 1, name: "Course 1", fullname: "Course 1", shouldSync: true },
      { id: 2, name: "Course 2", fullname: "Course 2", shouldSync: false },
    ] as Course[]

    render(<CourseList courses={courses} />)

    const btn = screen.getByText("selectAll")
    expect(btn).toBeInTheDocument()

    // Clicking it should send set-should-sync-all with true
    fireEvent.click(btn)
    expect(ipcRenderer.send).toHaveBeenCalledWith("set-should-sync-all", true)
  })

  it("should show deselectAll when all courses are synced", () => {
    const courses = [
      { id: 1, name: "Course 1", fullname: "Course 1", shouldSync: true },
      { id: 2, name: "Course 2", fullname: "Course 2", shouldSync: true },
    ] as Course[]

    render(<CourseList courses={courses} />)

    const btn = screen.getByText("deselectAll")
    expect(btn).toBeInTheDocument()

    // Clicking it should send set-should-sync-all with false
    fireEvent.click(btn)
    expect(ipcRenderer.send).toHaveBeenCalledWith("set-should-sync-all", false)
  })
})
