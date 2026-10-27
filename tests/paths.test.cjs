const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")
const vm = require("node:vm")
const ts = require("typescript")

// Exercise the real TypeScript utility with both Node path implementations.
// TypeScript is already a development dependency; Electron is not started.
const source = fs.readFileSync(path.join(__dirname, "../src/util.ts"), "utf8")
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
})

function loadUtilities(pathImplementation) {
  const exports = {}
  vm.runInNewContext(outputText, {
    exports,
    __dirname,
    require: name => {
      assert.equal(name, "path")
      return pathImplementation
    },
  })
  return exports
}

for (const [platform, implementation, root] of [
  ["Windows", path.win32, "C:\\Downloads\\WeBeep"],
  ["POSIX", path.posix, "/downloads/webeep"],
]) {
  const { sanitizePath, resolveInside } = loadUtilities(implementation)
  const cases = [
    ["Moodle trailing slash", "Course/Exercises/", ["Course", "Exercises"]],
    ["Windows trailing slash", "Course\\Exercises\\", ["Course", "Exercises"]],
    [
      "repeated trailing slashes",
      "Course/Exercises///",
      ["Course", "Exercises"],
    ],
    [
      "nested folders",
      "Course/Exercises/Subfolder/",
      ["Course", "Exercises", "Subfolder"],
    ],
    ["literal underscore folder", "Course/_/", ["Course", "_"]],
    [
      "existing filename",
      "Course/Exercises/file.pdf",
      ["Course", "Exercises", "file.pdf"],
    ],
    ["parent traversal", "Course/../file.pdf", ["Course", "_", "file.pdf"]],
    [
      "current directory component",
      "Course/./file.pdf",
      ["Course", "_", "file.pdf"],
    ],
    ["reserved Windows device", "Course/CON.txt/", ["Course", "_CON.txt"]],
    [
      "invalid Windows characters",
      "Course/bad:name?/",
      ["Course", "bad_name_"],
    ],
    [
      "trailing dots and spaces",
      "Course/Exercises... /",
      ["Course", "Exercises"],
    ],
    ["control characters", "Course/a\u0000b/", ["Course", "a_b"]],
    ["Unicode names", "Corso/Lezione 🛰️/", ["Corso", "Lezione 🛰️"]],
    ["empty name", "", ["_"]],
  ]

  for (const [description, input, components] of cases) {
    test(`${platform}: ${description}`, () => {
      const expected = components.join(implementation.sep)
      assert.equal(sanitizePath(input), expected)
      assert.equal(
        sanitizePath(expected),
        expected,
        "sanitization is idempotent",
      )
    })
  }

  test(`${platform}: Moodle folder root uses the existing file location`, () => {
    const moodlePath = implementation.join("Course", "Exercises", "/")
    const existing = implementation.join(
      root,
      "Course",
      "Exercises",
      "file.pdf",
    )
    assert.equal(resolveInside(root, moodlePath, "file.pdf"), existing)
    assert.equal(
      resolveInside(root, sanitizePath(moodlePath), "file.pdf"),
      existing,
    )
    assert.equal(
      resolveInside(root, moodlePath, "updated.pdf"),
      implementation.join(root, "Course", "Exercises", "updated.pdf"),
    )
  })

  test(`${platform}: untrusted path forms remain inside the download root`, () => {
    for (const candidate of [
      "../../outside",
      "Course/../../../outside",
      "/outside",
      "C:\\outside",
      "\\\\server\\share",
      "../WeBeep-other",
    ]) {
      const resolved = resolveInside(root, candidate, "file.pdf")
      const relative = implementation.relative(root, resolved)
      assert(!implementation.isAbsolute(relative), candidate)
      assert.notEqual(relative, "..", candidate)
      assert(!relative.startsWith(`..${implementation.sep}`), candidate)
    }
  })
}
