// js/comet-library.js
// IndexedDB-backed storage for FileSystemFileHandle objects.
// Allows re-opening previously-read files without a new file picker dialog.
// Falls back gracefully in browsers that don't support the File System Access API.

const DB_NAME = 'comet-library';
const STORE_NAME = 'handles';
const DB_VERSION = 1;

/** Opens (or creates) the IndexedDB instance. */
function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => e.target.result.createObjectStore(STORE_NAME);
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

/** Persists a FileSystemFileHandle under fileKey. Fire-and-forget safe. */
export async function storeHandle(fileKey, handle) {
    try {
        const db = await openDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(handle, fileKey);
        await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    } catch { /* quota / permission errors — silently ignore */ }
}

/** Retrieves a stored FileSystemFileHandle, or null if not found. */
export async function getHandle(fileKey) {
    try {
        const db = await openDb();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(fileKey);
        return await new Promise((res, rej) => {
            req.onsuccess = () => res(req.result ?? null);
            req.onerror = rej;
        });
    } catch {
        return null;
    }
}

/**
 * Retrieves the handle, requests read permission if needed, and
 * returns a live File object — or null if permission is denied / handle missing.
 * @param {string} fileKey
 * @returns {Promise<File|null>}
 */
export async function openFileFromHandle(fileKey) {
    const handle = await getHandle(fileKey);
    if (!handle) return null;
    try {
        let perm = await handle.queryPermission({ mode: 'read' });
        if (perm !== 'granted') perm = await handle.requestPermission({ mode: 'read' });
        if (perm !== 'granted') return null;
        return handle.getFile();
    } catch {
        return null;
    }
}

/** True if the browser supports the File System Access API. */
export const supportsFileSystemAccess = typeof window !== 'undefined' && 'showOpenFilePicker' in window;
