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
