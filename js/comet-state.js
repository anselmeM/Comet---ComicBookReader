// js/comet-state.js

import { UI as UI_CONSTANTS } from './comet-constants.js';

// Core State
let imageBlobs = [], originalImageBlobs = [], currentImageIndex = 0;
let fitMode = 'best', isMangaModeActive = false, isTwoPageSpreadActive = false, hudTimer = null;
let prefetchDepth = 2;
let currentFileKey = '', currentFileName = '';
let corruptPageCount = 0;
let tableOfContents = [];
let isSmartCoverActive = false;
let isSmartSplitActive = false;
let isVerticalScrollActive = false;

// Object URL Cache
const OBJECT_URL_CACHE_LIMIT = UI_CONSTANTS.OBJECT_URL_CACHE_LIMIT;
const objectUrlCache = new Map(); // imageEntry -> objectUrl

// Constants (Re-exported from centralized constants for backward compatibility)
export const ZOOM_STEP = UI_CONSTANTS.ZOOM_STEP;
export const HUD_TOP_BAR_HEIGHT = UI_CONSTANTS.HUD_TOP_BAR_HEIGHT;
export const BOUNDARY_MESSAGE_TIMEOUT = UI_CONSTANTS.BOUNDARY_MESSAGE_TIMEOUT;
export const SWIPE_THRESHOLD = UI_CONSTANTS.SWIPE_THRESHOLD;
export const VERTICAL_THRESHOLD = UI_CONSTANTS.VERTICAL_THRESHOLD;
export const DOUBLE_TAP_DELAY = UI_CONSTANTS.DOUBLE_TAP_DELAY;

// Swipe State
let touchStartX = 0, touchEndX = 0, touchStartY = 0, touchEndY = 0;
let isPotentialSwipe = false;

// Pan State
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let initialScrollLeft = 0, initialScrollTop = 0;
let didDrag = false;

// ---> NEW: Double Tap State <---
let lastTapTime = 0; // Timestamp of the last tap
let tapTimeout = null; // Timer to handle single tap action
// ---> END OF NEW VARIABLES <---


// Export getters and setters/modifiers
export function getState() {
    return {
        imageBlobs, originalImageBlobs, currentImageIndex,
        fitMode, isMangaModeActive, isTwoPageSpreadActive,
        hudTimer, touchStartX, touchEndX, touchStartY, touchEndY,
        isPotentialSwipe, isDragging, dragStartX, dragStartY,
        initialScrollLeft, initialScrollTop, didDrag,
        lastTapTime, // <-- Export new state
        tapTimeout   // <-- Export new state
    };
}

// ... (Existing setters: setImageBlobs, setOriginalImageBlobs, etc.) ...
export function setImageBlobs(blobs) { imageBlobs = blobs; }
export function setOriginalImageBlobs(blobs) { originalImageBlobs = blobs; }
export function setCurrentImageIndex(index) { currentImageIndex = index; }
export function setFitMode(mode) { fitMode = mode; }
export function setIsMangaModeActive(active) { isMangaModeActive = active; }
export function setIsTwoPageSpreadActive(active) { isTwoPageSpreadActive = active; }
export function setHudTimer(timer) { hudTimer = timer; }
export function getPrefetchDepth() { return prefetchDepth; }
export function setPrefetchDepth(n) { prefetchDepth = Math.max(1, Math.min(5, parseInt(n, 10) || 2)); }
export function getCurrentFileKey() { return currentFileKey; }
export function getCurrentFileName() { return currentFileName; }
export function setCurrentFile(key, name) { currentFileKey = key; currentFileName = name; }
export function getCorruptPageCount() { return corruptPageCount; }
export function incrementCorruptPageCount() { corruptPageCount++; }
export function getTableOfContents() { return tableOfContents; }
export function setTableOfContents(toc) { tableOfContents = Array.isArray(toc) ? toc : []; }
export function getIsSmartCoverActive() { return isSmartCoverActive; }
export function setIsSmartCoverActive(v) { isSmartCoverActive = !!v; }
export function getIsSmartSplitActive() { return isSmartSplitActive; }
export function setIsSmartSplitActive(v) { isSmartSplitActive = !!v; }
export function getIsVerticalScrollActive() { return isVerticalScrollActive; }
export function setIsVerticalScrollActive(v) { isVerticalScrollActive = !!v; }
export function setTouchStart(x, y) { touchStartX = x; touchStartY = y; touchEndX = x; touchEndY = y; }
export function setTouchEnd(x, y) { touchEndX = x; touchEndY = y; }
export function setIsPotentialSwipe(potential) { isPotentialSwipe = potential; }
export function setIsDragging(dragging) { isDragging = dragging; }
export function setDragStart(x, y) { dragStartX = x; dragStartY = y; }
export function setInitialScroll(left, top) { initialScrollLeft = left; initialScrollTop = top; }
export function setDidDrag(dragged) { didDrag = dragged; }

// ---> NEW: Setters for Double Tap State <---
export function setLastTapTime(time) { lastTapTime = time; }
export function setTapTimeout(timeout) { tapTimeout = timeout; }
export function clearTapTimeout() { clearTimeout(tapTimeout); tapTimeout = null; }
// ---> END OF NEW SETTERS <---

/**
 * Retrieves a cached Object URL for the given image entry and updates its LRU position.
 * @param {Object} imageEntry
 * @returns {string|null}
 */
export function getCachedObjectUrl(imageEntry) {
    if (objectUrlCache.has(imageEntry)) {
        const url = objectUrlCache.get(imageEntry);
        // Refresh LRU position by deleting and re-setting
        objectUrlCache.delete(imageEntry);
        objectUrlCache.set(imageEntry, url);
        return url;
    }
    return null;
}

/**
 * Adds an Object URL to the cache and revokes the oldest if the limit is reached.
 * @param {Object} imageEntry
 * @param {string} url
 */
export function addObjectUrl(imageEntry, url) {
    if (objectUrlCache.has(imageEntry)) {
        objectUrlCache.delete(imageEntry);
    }
    objectUrlCache.set(imageEntry, url);

    if (objectUrlCache.size > OBJECT_URL_CACHE_LIMIT) {
        const firstEntry = objectUrlCache.entries().next().value;
        if (firstEntry) {
            const [oldEntry, oldUrl] = firstEntry;
            if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
                URL.revokeObjectURL(oldUrl);
            }
            objectUrlCache.delete(oldEntry);
        }
    }
}

/**
 * Revokes all cached Object URLs and clears the cache.
 */
export function clearObjectUrlCache() {
    for (const url of objectUrlCache.values()) {
        if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
            URL.revokeObjectURL(url);
        }
    }
    objectUrlCache.clear();
}

export function reverseImageBlobs() { imageBlobs.reverse(); }
export function resetSwipeState() {
    isPotentialSwipe = false;
    touchStartX = 0; touchEndX = 0; touchStartY = 0; touchEndY = 0;
}
export function resetPanState() {
    isDragging = false;
    dragStartX = 0; dragStartY = 0;
    initialScrollLeft = 0; initialScrollTop = 0;
}
export function resetAllState() {
    imageBlobs = []; originalImageBlobs = []; currentImageIndex = 0;
    clearObjectUrlCache();
    fitMode = 'best'; isMangaModeActive = false; isTwoPageSpreadActive = false; hudTimer = null;
    resetSwipeState();
    resetPanState();
    didDrag = false;
    lastTapTime = 0;
    clearTapTimeout();
    currentFileKey = ''; currentFileName = '';
    corruptPageCount = 0;
    tableOfContents = [];
    // Note: isSmartCoverActive is intentionally NOT reset — it's a user preference
    // prefetchDepth is intentionally NOT reset — it's a user preference
}
