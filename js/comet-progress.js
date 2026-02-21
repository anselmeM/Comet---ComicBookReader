// js/comet-progress.js
// Per-file reading progress, persisted to localStorage.
// Files are identified by "filename:filesize" — stable without needing file paths.

const PROGRESS_KEY = 'comet-progress';
const MAX_HISTORY = 10;

/** Returns a stable key for the given File object. */
export function makeFileKey(file) {
    return `${file.name}:${file.size}`;
}

/** Returns saved progress for a file key, or null if none. */
export function getProgress(fileKey) {
    try {
        const data = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
        return data[fileKey] ?? null;
    } catch {
        return null;
    }
}

/** Saves the current page index for a file. */
export function saveProgress(fileKey, fileName, pageIndex, totalPages) {
    try {
        const data = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
        data[fileKey] = { fileName, lastPage: pageIndex, totalPages, lastRead: new Date().toISOString() };
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
    } catch { /* ignore quota errors */ }
}

/** Returns all saved progress entries, sorted newest-first, capped at MAX_HISTORY. */
export function getAllProgress() {
    try {
        const data = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
        return Object.entries(data)
            .map(([key, val]) => ({ key, ...val }))
            .sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead))
            .slice(0, MAX_HISTORY);
    } catch {
        return [];
    }
}

/** Removes the progress entry for a specific file key. */
export function clearProgress(fileKey) {
    try {
        const data = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
        delete data[fileKey];
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
    } catch { }
}
