/* eslint-disable @typescript-eslint/no-explicit-any */
import { i18nInit, i18n } from "../src/modules/i18next"

jest.mock("i18next-fs-backend", () => {
  return class MockBackend {}
})

describe("i18next module", () => {
  it("initializes i18n successfully", async () => {
    // Spy on i18n.init and i18n.use
    const useSpy = jest.spyOn(i18n, "use").mockReturnThis()
    const initSpy = jest.spyOn(i18n, "init").mockResolvedValue({} as any)

    await i18nInit()

    expect(useSpy).toHaveBeenCalled()
    expect(initSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackLng: "en",
        defaultNS: "common",
      }),
    )

    // Subsequent calls resolve immediately
    await i18nInit()
    expect(initSpy).toHaveBeenCalledTimes(1)
  })
})
