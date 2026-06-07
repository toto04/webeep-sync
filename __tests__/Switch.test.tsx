/**
 * @jest-environment jsdom
 */

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import { Switch } from "../src/client/components/Switch"

// react-switch doesn't need to be mocked heavily, but it relies on an input checkbox underneath.
describe("Switch", () => {
  it("renders correctly and propagates changes", () => {
    const onChange = jest.fn()
    render(<Switch checked={false} onChange={onChange} disabled={false} />)

    // react-switch renders a checkbox input
    const checkbox = screen.getByRole("switch")
    expect(checkbox).not.toBeChecked()

    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("respects disabled state", () => {
    const onChange = jest.fn()
    render(<Switch checked={true} onChange={onChange} disabled={true} />)

    const checkbox = screen.getByRole("switch")
    expect(checkbox).toBeChecked()
    expect(checkbox).toBeDisabled()
  })
})
