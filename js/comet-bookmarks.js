// js/comet-bookmarks.js
// Per-file bookmarks (favourite page indices), persisted to localStorage.

const BOOKMARKS_KEY = 'comet-bookmarks';

function load() {
    try { return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '{}'); }
    catch { return {}; }
}

function persist(data) {
    try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(data)); }
    catch { }
}

/** Returns the sorted array of bookmarked page indices for a file. */
export function getBookmarks(fileKey) {
    return load()[fileKey] ?? [];
}

/**
 * Adds or removes a bookmark for the given page.
 * @returns {boolean} true if the page is NOW bookmarked, false if removed.
 */
export function toggleBookmark(fileKey, pageIndex) {
    const data = load();
    const pages = data[fileKey] ?? [];
    const pos = pages.indexOf(pageIndex);
    if (pos === -1) {
        pages.push(pageIndex);
        pages.sort((a, b) => a - b);
        data[fileKey] = pages;
        persist(data);
        return true;
    } else {
        pages.splice(pos, 1);
        data[fileKey] = pages;
        persist(data);
        return false;
    }
}

/** Returns true if the given page is bookmarked. */
export function isBookmarked(fileKey, pageIndex) {
    return getBookmarks(fileKey).includes(pageIndex);
}

/** Removes all bookmarks for a file. */
export function clearBookmarks(fileKey) {
    const data = load();
    delete data[fileKey];
    persist(data);
}
