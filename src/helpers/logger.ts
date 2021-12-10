import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const DEV = process.argv.includes('--dev')
let logFolderPath = path.join(app.getPath('userData'), 'app_logs')

function timeStamp() {
    return new Date().toISOString().substring(0, 19)
}

let logFile: fs.WriteStream | undefined = undefined
enum LogLevel {
    NONE,
    WARN,
    INFO,
    DEBUG,
}

const logArg = process.argv.find(s => s.startsWith('--log='))?.substring(6) as keyof typeof LogLevel
const logLevel: LogLevel = LogLevel[logArg] ?? LogLevel.DEBUG

if (!DEV) {
    fs.mkdirSync(logFolderPath, { recursive: true })
    let logPath = path.join(logFolderPath, `${timeStamp()}.log`)
    logFile = fs.createWriteStream(logPath, { flags: 'a' })
    logFile.write('\n-- LOG BEGIN --\n')
    logFile.write(`Log Level: ${LogLevel[logLevel]}\n\n`)

    process.on('exit', () => {
        log('closing stream!')
        logFile.end()
    })
}

export function error(message: any, _module?: string) {
    if (logLevel < LogLevel.WARN) return
    let mstr = _module ? ` [${_module}]` : ''
    if (DEV) console.error(message)
    else try {
        logFile.write(`[${timeStamp()}]${mstr} <WARN> ${String(message)}\n`)
    } catch (e) { }
}

export function log(message: any, _module?: string) {
    if (logLevel < LogLevel.INFO) return
    let mstr = _module ? ` [${_module}]` : ''
    if (DEV) console.log(message)
    else try {
        logFile.write(`[${timeStamp()}]${mstr} <INFO> ${String(message)}\n`)
    } catch (e) { }
}

export function debug(message: any, _module?: string) {
    if (logLevel < LogLevel.DEBUG) return
    let mstr = _module ? ` [${_module}]` : ''
    if (DEV) console.log(message)
    else try {
        logFile.write(`[${timeStamp()}]${mstr} <DBUG> ${String(message)}\n`)
    } catch (e) { }
}

export function createLogger(_module: string) {
    return {
        error: (message: any) => error(message, _module),
        log: (message: any) => log(message, _module),
        debug: (message: any) => debug(message, _module),
    }
}