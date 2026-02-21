/**
 * comet-constants.js
 * Centralized configuration and constants for the Comet Reader application.
 * This ensures consistency and makes it easier to update URLs, regexes, and UI thresholds.
 */

// --- File Handling & Parsing ---

// Supported image extensions within archive files
export const IMAGE_REGEX = /\.(jpe?g|png|gif|webp|avif|svg)$/i;

// File Picker Configuration for File System Access API
export const COMIC_FILE_PICKER_TYPES = [
    {
        description: 'Comic Files',
        accept: {
            'application/vnd.comicbook+zip': ['.cbz'],
            'application/vnd.comicbook-rar': ['.cbr'],
            'application/x-cbz': ['.cbz'],
            'application/x-cbr': ['.cbr'],
            'application/zip': ['.cbz'],
            'application/x-zip-compressed': ['.cbz'],
            'application/x-rar-compressed': ['.cbr'],
            'application/pdf': ['.pdf'],
        },
    },
];

// --- External Libraries (CDNs) ---

export const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
export const PDFJS_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
export const LIBARCHIVE_URL = 'https://cdn.jsdelivr.net/npm/libarchivejs@2.0.2/dist/libarchive.js';
export const LIBARCHIVE_WORKER_URL = 'https://cdn.jsdelivr.net/npm/libarchivejs@2.0.2/dist/worker-bundle.js';

// --- Local Storage & IndexedDB Keys ---

export const STORAGE_KEYS = {
    SETTINGS: 'comet-settings',
    PROGRESS: 'comet-progress',
    BOOKMARKS: 'comet-bookmarks',
    THEME: 'theme',
};

export const DB_CONFIG = {
    NAME: 'comet-library',
    STORE_NAME: 'handles',
    VERSION: 1,
};

// --- UI & Interaction Thresholds ---

export const UI = {
    ZOOM_STEP: 1.25,
    HUD_TOP_BAR_HEIGHT: '50px',
    BOUNDARY_MESSAGE_TIMEOUT: 2500,
    SWIPE_THRESHOLD: 50,         // Minimum swipe distance
    VERTICAL_THRESHOLD: 75,      // Minimum vertical swipe distance
    DOUBLE_TAP_DELAY: 300,       // Max time between taps for double-tap
    TAP_THRESHOLD: 10,           // Max pixels moved to count as a tap
    MAX_HISTORY: 10,             // Max items in Recent Files
    OBJECT_URL_CACHE_LIMIT: 20,  // Max object URLs to keep in LRU cache
};
