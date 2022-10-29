import path from 'path'

export const __static = path.join(__dirname, 'static')

export enum DownloadState {
    idle,
    fetchingCourses,
    fetchingFiles,
    downloading,
}

export enum SyncResult {
    success,
    alreadySyncing,
    stopped,
    networkError,
    fsError,
    unknownError,
}

export function formatSize(size: number): string {
    const suxs = ['B', 'kB', 'MB', 'GB', 'TB']
    let i = 0;
    while (size > 1000 && i < suxs.length - 1) {
        size /= 1000
        i++
    }
    return size.toFixed(1) + suxs[i]
}

/**
 * this functions inserts breakpoints after / \ and + to make strings too long are broken
 * @param str the string to be rendered breakable
 */
export function breakableString(str: string): string {
    return str.replace(/\\/g, '\\\u200B').replace(/\//g, '/\u200B').replace(/\+/g, '+\u200B')
}

/**
 * replaces a couple of problematic characters that cause havoc in the FS (expecially on windows)
 * @param str the string to be sanitized
 * @returns the sanitized string
 */
export function sanitizePath(str: string): string {
    str = str.replace(/[\n\t\r]+/g, ' ')    // replace invalid white spaces
    str = str.replace(/[:*?"<>|]/g, '_')    // remove invalid windows characters
    str = str.replace(/ *\.? *\/ */g, '/')  // remove trailing/leading dots and spaces from folders
    str = str.replace(/ *\.? *\\ */g, '\\') // remove trailing/leading dots and spaces from Windows
    return str
}

/**
 * generates a random 6-chars UID for api calls
 */
export function generateUID(): string {
    let s = Math.random().toString(36).substring(2, 5)
    s += Math.random().toString(36).substring(2, 5)
    return s.toUpperCase()
}