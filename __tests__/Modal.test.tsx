/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import "@testing-library/jest-dom"
import { Modal } from "../src/client/components/Modal"

jest.mock("react-icons/io5", () => ({
  IoClose: ({ onClick, className }: any) => (
    <button data-testid="close-btn" className={className} onClick={onClick}>
      Close
    </button>
  ),
}))

describe("Modal", () => {
  it("renders correctly with title and children", () => {
    const onClose = jest.fn()
    render(
      <Modal title="My Modal" onClose={onClose}>
        <div data-testid="child-content">Content</div>
      </Modal>,
    )

    expect(screen.getByText("My Modal")).toBeInTheDocument()
    expect(screen.getByTestId("child-content")).toBeInTheDocument()
  })

  it("calls onClose when the close icon is clicked", () => {
    const onClose = jest.fn()
    render(
      <Modal title="Test" onClose={onClose}>
        Content
      </Modal>,
    )

    fireEvent.click(screen.getByTestId("close-btn"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when pressing Escape", () => {
    const onClose = jest.fn()
    const { container } = render(
      <Modal title="Test" onClose={onClose}>
        Content
      </Modal>,
    )

    fireEvent.keyDown(container.firstChild as HTMLElement, { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when clicking outside the modal content", () => {
    const onClose = jest.fn()
    const { container } = render(
      <Modal title="Test" onClose={onClose}>
        Content
      </Modal>,
    )

    fireEvent.click(container.firstChild as HTMLElement) // Click the container
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not call onClose when clicking inside the modal content", () => {
    const onClose = jest.fn()
    render(
      <Modal title="Test" onClose={onClose}>
        <div data-testid="inner">Inner</div>
      </Modal>,
    )

    fireEvent.click(screen.getByTestId("inner"))
    expect(onClose).not.toHaveBeenCalled()
  })

  it("adds shadow on scroll down and removes on scroll up", () => {
    const { container } = render(
      <Modal onClose={() => {}} title="Test Modal">
        <div>Modal content</div>
      </Modal>,
    )

    const headerDiv = container.querySelector(".modal-header")
    const contentDiv = container.querySelector(".modal-content")

    expect(headerDiv.className).not.toContain("shadow")

    const originalScrollTop = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "scrollTop",
    )

    // Scroll down
    act(() => {
      Object.defineProperty(Element.prototype, "scrollTop", {
        configurable: true,
        value: 10,
      })
      fireEvent.scroll(contentDiv)
    })
    expect(headerDiv.className).toContain("shadow")

    // Scroll up
    act(() => {
      Object.defineProperty(Element.prototype, "scrollTop", {
        configurable: true,
        value: 0,
      })
      fireEvent.scroll(contentDiv)
    })
    expect(headerDiv.className).not.toContain("shadow")

    if (originalScrollTop) {
      Object.defineProperty(Element.prototype, "scrollTop", originalScrollTop)
    } else {
      // In some jsdom versions it might not exist, though it should
      delete (Element.prototype as any).scrollTop
    }
  })
})
