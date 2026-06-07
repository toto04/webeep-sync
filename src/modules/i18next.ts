import path from "path"
import fs from "fs"
import i18n from "i18next"

import { __static } from "../util"

let initializing = false
let initialized = false

export function i18nInit(): Promise<void> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    if (initialized) {
      resolve()
      return
    }
    if (initializing) i18n.on("loaded", () => resolve())
    else {
      initializing = true
      // Custom backend to load locales without external dependencies
      const customBackend = {
        type: "backend" as const,
        read: (
          language: string,
          namespace: string,
          callback: (error: unknown, data: unknown) => void,
        ) => {
          const filePath = path.join(
            __static,
            `/locales/${language}/${namespace}.json`,
          )
          try {
            const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
            callback(null, data)
          } catch (e) {
            callback(e, false)
          }
        },
      }

      await i18n.use(customBackend).init({
        ns: ["common", "tray", "client", "notifications"],
        defaultNS: "common",
        fallbackLng: "en",
        saveMissing: false,
      })
      initialized = true
      resolve()
    }
  })
}

export { i18n }
