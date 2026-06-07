/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-multi-comp */
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import { Checkbox } from "../src/client/components/Checkbox"

// Mock the icons
jest.mock("react-icons/io5", () => ({
  IoCheckbox: ({ onClick, className }: any) => (
    <svg data-testid="positive-icon" onClick={onClick} className={className} />
  ),
  IoSquareOutline: ({ onClick, color }: any) => (
    <svg data-testid="negative-icon" onClick={onClick} style={{ color }} />
  ),
}))

describe("Checkbox", () => {
  it("renders negative icon when value is false", () => {
    const onChange = jest.fn()
    render(<Checkbox value={false} onChange={onChange} color="blue" />)

    const negativeIcon = screen.getByTestId("negative-icon")
    expect(negativeIcon).toBeInTheDocument()

    // Test click toggles it to true
    fireEvent.click(negativeIcon)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("renders positive icon when value is true", () => {
    const onChange = jest.fn()
    render(<Checkbox value={true} onChange={onChange} color="green" />)

    const positiveIcon = screen.getByTestId("positive-icon")
    expect(positiveIcon).toBeInTheDocument()
    expect(positiveIcon).toHaveClass("active")

    // Checkbox container should have the background color when value is true
    const container = screen.getByTestId("positive-icon").parentElement
    expect(container).toHaveStyle("background-color: rgb(0, 128, 0)")

    // Test click toggles it to false
    fireEvent.click(positiveIcon)
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it("uses custom icons if provided", () => {
    const CustomPositive = () => <div data-testid="custom-positive" />
    const CustomNegative = () => <div data-testid="custom-negative" />

    const { rerender } = render(
      <Checkbox
        value={true}
        onChange={jest.fn()}
        PositiveIcon={CustomPositive}
      />,
    )
    expect(screen.getByTestId("custom-positive")).toBeInTheDocument()

    rerender(
      <Checkbox
        value={false}
        onChange={jest.fn()}
        NegativeIcon={CustomNegative}
      />,
    )
    expect(screen.getByTestId("custom-negative")).toBeInTheDocument()
  })
})
