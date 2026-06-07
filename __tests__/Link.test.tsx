/**
 * @jest-environment jsdom
 */

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import { Link } from "../src/client/components/Link"
import { shell } from "electron"

jest.mock("electron", () => ({
  shell: {
    openExternal: jest.fn(),
  },
}))

describe("Link", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders children and classes", () => {
    render(
      <Link
        href="https://example.com"
        className="my-class"
        style={{ color: "red" }}
      >
        Click me
      </Link>,
    )

    const anchor = screen.getByText("Click me")
    expect(anchor).toBeInTheDocument()
    expect(anchor).toHaveClass("my-class")
    expect(anchor).toHaveStyle("color: rgb(255, 0, 0)")
  })

  it("calls shell.openExternal on click", () => {
    render(<Link href="https://example.com">Click me</Link>)
    const anchor = screen.getByText("Click me")

    fireEvent.click(anchor)

    expect(shell.openExternal).toHaveBeenCalledWith("https://example.com")
  })
})
