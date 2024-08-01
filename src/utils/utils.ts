/**
 * Trim a string to a desired length so it fits within a limit
 * @param str The string to trim
 * @param length The length to trim to
 * @returns The trimmed string
 */
export function trimString(str: string, length: number): string {
    return str.length > length ? `${str.substring(0, length - 3).trim()}...` : str;
}