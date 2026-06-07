/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { renderHook } from "@testing-library/react"
import useOnOutsideClick from "../src/client/hooks/useOnOutsideClick"

describe("useOnOutsideClick", () => {
  let ref: any
  let callback: jest.Mock
  let headbar: HTMLElement

  beforeEach(() => {
    callback = jest.fn()
    ref = { current: document.createElement("div") }
    document.body.appendChild(ref.current)

    headbar = document.createElement("div")
    headbar.className = "headbar"
    document.body.appendChild(headbar)
  })

  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("calls callback when clicking outside the element", () => {
    renderHook(() => useOnOutsideClick(ref, callback))

    // Click outside
    const outsideElement = document.createElement("div")
    document.body.appendChild(outsideElement)
    outsideElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))

    expect(callback).toHaveBeenCalled()
  })

  it("does not call callback when clicking inside the element", () => {
    renderHook(() => useOnOutsideClick(ref, callback))

    const insideElement = document.createElement("span")
    ref.current.appendChild(insideElement)

    insideElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
    expect(callback).not.toHaveBeenCalled()
  })

  it("does not call callback when clicking inside the headbar", () => {
    renderHook(() => useOnOutsideClick(ref, callback))

    headbar.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
    expect(callback).not.toHaveBeenCalled()
  })
})
