import {
  formatSize,
  breakableString,
  sanitizePath,
  generateUID,
} from "../src/util"

describe("util module", () => {
  describe("formatSize", () => {
    it("formats sizes correctly", () => {
      expect(formatSize(500)).toBe("500.0B")
      expect(formatSize(1500)).toBe("1.5kB")
      expect(formatSize(1500000)).toBe("1.5MB")
      expect(formatSize(1500000000)).toBe("1.5GB")
    })
  })

  describe("breakableString", () => {
    it("adds zero-width spaces after slashes and pluses", () => {
      expect(breakableString("a/b\\c+d")).toBe("a/\u200Bb\\\u200Bc+\u200Bd")
    })
  })

  describe("sanitizePath", () => {
    it("replaces invalid windows characters", () => {
      expect(sanitizePath("file:name*?")).toBe("file_name__")
    })

    it("cleans up directory separators", () => {
      expect(sanitizePath("foo / bar")).toBe("foo/bar")
      expect(sanitizePath("foo \\ bar")).toBe("foo\\bar")
    })
  })

  describe("generateUID", () => {
    it("generates a 6 character string", () => {
      const uid = generateUID()
      expect(typeof uid).toBe("string")
      expect(uid.length).toBe(6)
    })
  })
})
