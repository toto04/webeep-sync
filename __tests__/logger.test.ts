jest.mock("electron", () => ({
  app: {
    getPath: jest.fn().mockReturnValue("/mock/path"),
  },
}))

jest.mock("fs/promises", () => ({
  __esModule: true,
  default: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    open: jest.fn().mockResolvedValue({
      write: jest.fn().mockResolvedValue(undefined),
    }),
  },
}))

import { createLogger } from "../src/modules/logger"

describe("Logger", () => {
  it("creates a logger with expected methods", () => {
    const logger = createLogger("TestModule")
    expect(typeof logger.error).toBe("function")
    expect(typeof logger.log).toBe("function")
    expect(typeof logger.debug).toBe("function")
  })

  it("can log messages without throwing exceptions", () => {
    const logger = createLogger("TestModule")
    expect(() => {
      logger.log("test log message")
      logger.debug("test debug message")
      logger.error("test error message")
    }).not.toThrow()
  })
})
