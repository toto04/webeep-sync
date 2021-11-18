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