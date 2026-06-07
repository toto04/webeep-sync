/* eslint-disable @typescript-eslint/no-explicit-any */
import { LoginContext } from "../src/client/LoginContext"

describe("LoginContext", () => {
  it("provides default values", () => {
    // We just check that the context exists and has a default value structure
    // Since React Context's default value is internal to React, we just verify it exports something.
    expect(LoginContext).toBeDefined()
    expect((LoginContext as any)._currentValue).toEqual({
      isLogged: false,
      syncing: false,
      connected: true,
    })
  })
})
