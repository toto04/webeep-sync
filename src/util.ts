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
    let suxs = ['B', 'kB', 'MB', 'GB', 'TB']
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