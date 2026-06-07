/**
 * @jest-environment jsdom
 */

import React from "react"
import { render } from "@testing-library/react"
import "@testing-library/jest-dom"
import { PrograssBar } from "../src/client/components/ProgressBar"

describe("ProgressBar", () => {
  it("renders with given progress", () => {
    const { container } = render(<PrograssBar progress={0.5} />)
    const innerBar = container.querySelector(".progress-bar-inside")
    expect(innerBar).toHaveStyle("width: 50%")
  })

  it("handles NaN progress", () => {
    const { container } = render(<PrograssBar progress={NaN} />)
    const innerBar = container.querySelector(".progress-bar-inside")
    expect(innerBar).toHaveStyle("width: 0%")
  })
})
