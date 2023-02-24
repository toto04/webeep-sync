/* eslint-disable no-empty */
import fs from "fs/promises"
import path from "path"
import { EventEmitter } from "events"
import { app } from "electron"

const DEV = process.argv.includes("--dev")
const logFolderPath = path.join(app.getPath("userData"), "app_logs")

function timeStamp() {
  return new Date().toISOString().substring(0, 19)
}

enum LogLevel {
  NONE,
  WARN,
  INFO,
  DEBUG,
}

class Logger extends EventEmitter {
  logFile: fs.FileHandle | undefined = undefined
  ready = false
  isWriting = false
  logLevel: LogLevel

  constructor() {
    super()

    // parse arguments for log flag (e.g --log=WARN)
    const logArg = process.argv
      .find(s => s.startsWith("--log="))
      ?.substring(6) as keyof typeof LogLevel
    this.logLevel = LogLevel[logArg] ?? LogLevel.INFO

    if (!DEV) {
      fs.mkdir(logFolderPath, { recursive: true }).then(async () => {
        const logPath = path.join(
          logFolderPath,
          `${timeStamp()}.log`.replace(/:/g, ".")
        )
        this.logFile = await fs.open(logPath, "w")
        this.writeToFile(
          `-- WeBeep Sync LOG BEGIN --\nLog Level: ${
            LogLevel[this.logLevel]
          }\n\n`
        )

        this.ready = true
        this.emit("ready")
      })
    }
  }

  /**
   * this functions is to be called internally to append safely new log lines to the log file, it
   * insures that no writing operations occour simultaneously and that the file is opened
   * @param str the string to be appended to the log file
   */
  private async writeToFile(str: string) {
    if (!this.ready) this.once("ready", () => this.writeToFile(str))
    if (this.isWriting)
      this.once("finished_writing", () => this.writeToFile(str))
    else {
      this.isWriting = true
      await this.logFile.write(str + "\n")
      this.isWriting = false
      this.emit("finished_writing")
    }
  }

  error(message: unknown, _module?: string) {
    if (this.logLevel < LogLevel.WARN) return
    try {
      const mstr = _module ? ` [${_module}]` : ""
      const msg = `[${timeStamp()}]${mstr} <WARN> ${String(message)}`
      if (!this.logFile) console.error(msg)
      else this.writeToFile(msg)
    } catch (e) {}
  }

  log(message: unknown, _module?: string) {
    if (this.logLevel < LogLevel.INFO) return
    try {
      const mstr = _module ? ` [${_module}]` : ""
      const msg = `[${timeStamp()}]${mstr} <INFO> ${String(message)}`
      if (!this.logFile) console.log(msg)
      else this.writeToFile(msg)
    } catch (e) {}
  }

  debug(message: unknown, _module?: string) {
    if (this.logLevel < LogLevel.DEBUG) return
    try {
      const mstr = _module ? ` [${_module}]` : ""
      const msg = `[${timeStamp()}]${mstr} <DBUG> ${String(message)}`
      if (!this.logFile) console.log(msg)
      else this.writeToFile(msg)
    } catch (e) {}
  }

  /**
   * this function is used to create an object with three loggers for various level of logging,
   * each will display the correct name of the module for better log clarity
   * @param moduleName the name of the module to be displayed when logging
   * @returns an object with the three loggers
   */
  createLogger(moduleName: string) {
    return {
      error: (message: unknown) => this.error(message, moduleName),
      log: (message: unknown) => this.log(message, moduleName),
      debug: (message: unknown) => this.debug(message, moduleName),
    }
  }
}
const logger = new Logger()
export default logger
export const createLogger = (
  moduleName: string
): ReturnType<typeof logger.createLogger> => {
  return logger.createLogger(moduleName)
}
