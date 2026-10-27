import path from "path"

export const __static = path.join(__dirname, "static")

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
  const suxs = ["B", "kB", "MB", "GB", "TB"]
  let i = 0
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
  return str
    .replace(/\\/g, "\\\u200B")
    .replace(/\//g, "/\u200B")
    .replace(/\+/g, "+\u200B")
}

/**
 * Sanitizes a relative path while preserving its folder structure.
 * @param str the string to be sanitized
 * @returns the sanitized string
 */
export function sanitizePath(str: string): string {
  const reservedName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i
  return (
    str
      .replace(/[\n\t\r]+/g, " ")
      .replace(/\\/g, "/")
      // Moodle folder paths end with a separator. It is not an empty folder name.
      .replace(/\/+$/g, "")
      .split("/")
      .map(part => {
        const name = Array.from(part, character =>
          character.charCodeAt(0) < 32 ? "_" : character,
        )
          .join("")
          .replace(/[:*?"<>|]/g, "_")
          .trim()
          .replace(/[. ]+$/g, "")
        if (!name || name === "." || name === "..") return "_"
        return reservedName.test(name) ? `_${name}` : name
      })
      .join(path.sep)
  )
}

/** Resolves sanitized path components within the configured download directory. */
export function resolveInside(root: string, ...segments: string[]): string {
  const base = path.resolve(root)
  const target = path.resolve(base, ...segments.map(sanitizePath))
  const relative = path.relative(base, target)
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Path escapes the configured download directory")
  }
  return target
}

/**
 * generates a random 6-chars UID for api calls
 */
export function generateUID(): string {
  let s = Math.random().toString(36).substring(2, 5)
  s += Math.random().toString(36).substring(2, 5)
  return s.toUpperCase()
}
