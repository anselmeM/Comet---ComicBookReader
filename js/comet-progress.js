// js/comet-progress.js
// Per-file reading progress, persisted to localStorage.
// Files are identified by "filename:filesize" — stable without needing file paths.

const PROGRESS_KEY = 'comet-progress';
const MAX_HISTORY = 10;

let progressCache = null;

function loadCache() {
    if (progressCache !== null) return;
    try {
        progressCache = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    } catch {
        progressCache = {};
    }
}

// Ensure cache is loaded initially
if (typeof window !== 'undefined') {
    loadCache();
    // Cross-tab synchronization
    window.addEventListener('storage', (e) => {
        if (e.key === PROGRESS_KEY) {
            try {
                progressCache = JSON.parse(e.newValue || '{}');
            } catch {
                progressCache = {};
            }
        }
    });
}

/** Resets the progress cache, strictly for testing purposes. */
export function resetProgressCache() {
    progressCache = null;
    if (typeof window !== 'undefined') {
        loadCache();
    }
}

/** Returns a stable key for the given File object. */
export function makeFileKey(file) {
    return `${file.name}:${file.size}`;
}

/** Returns saved progress for a file key, or null if none. */
export function getProgress(fileKey) {
    if (progressCache === null) loadCache();
    return progressCache[fileKey] ?? null;
}

/** Saves the current page index for a file. */
export function saveProgress(fileKey, fileName, pageIndex, totalPages) {
    if (progressCache === null) loadCache();

    const now = new Date().toISOString();
    const existing = progressCache[fileKey];

    // Performance Optimization: Update in-memory cache and avoid redundant localStorage
    // serialization if only the timestamp changes but the page is identical.
    if (existing && existing.lastPage === pageIndex && existing.totalPages === totalPages) {
        progressCache[fileKey] = { ...existing, lastRead: now };
        return;
    }

    progressCache[fileKey] = { fileName, lastPage: pageIndex, totalPages, lastRead: now };

    try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressCache));
    } catch { /* ignore quota errors */ }
}

/** Returns all saved progress entries, sorted newest-first, capped at MAX_HISTORY. */
export function getAllProgress() {
    if (progressCache === null) loadCache();
    return Object.entries(progressCache)
        .map(([key, val]) => ({ key, ...val }))
        .sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead))
        .slice(0, MAX_HISTORY);
}

/** Removes the progress entry for a specific file key. */
export function clearProgress(fileKey) {
    if (progressCache === null) loadCache();
    if (progressCache[fileKey]) {
        delete progressCache[fileKey];
        try {
            localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressCache));
        } catch { }
    }
}
