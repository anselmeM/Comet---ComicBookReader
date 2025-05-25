// js/comet-state.js

// Core State
let imageBlobs = [], originalImageBlobs = [], currentImageIndex = 0;
let currentObjectUrl = null, previousObjectUrl = null;
let fitMode = 'best', isMangaModeActive = false, hudTimer = null;

// Constants
export const ZOOM_STEP = 1.25;
export const HUD_TOP_BAR_HEIGHT = '50px';
export const BOUNDARY_MESSAGE_TIMEOUT = 2500;
export const SWIPE_THRESHOLD = 50;
export const VERTICAL_THRESHOLD = 75;

// Swipe State
let touchStartX = 0, touchEndX = 0, touchStartY = 0, touchEndY = 0;
let isPotentialSwipe = false;

// Pan State
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let initialScrollLeft = 0, initialScrollTop = 0;
let didDrag = false;

// Export getters and setters/modifiers
export function getState() {
    return {
        imageBlobs, originalImageBlobs, currentImageIndex,
        currentObjectUrl, previousObjectUrl, fitMode, isMangaModeActive,
        hudTimer, touchStartX, touchEndX, touchStartY, touchEndY,
        isPotentialSwipe, isDragging, dragStartX, dragStartY,
        initialScrollLeft, initialScrollTop, didDrag
    };
}

export function setImageBlobs(blobs) { imageBlobs = blobs; }
export function setOriginalImageBlobs(blobs) { originalImageBlobs = blobs; }
export function setCurrentImageIndex(index) { currentImageIndex = index; }
export function setCurrentObjectUrl(url) { currentObjectUrl = url; }
export function setPreviousObjectUrl(url) { previousObjectUrl = url; }
export function setFitMode(mode) { fitMode = mode; }
export function setIsMangaModeActive(active) { isMangaModeActive = active; }
export function setHudTimer(timer) { hudTimer = timer; }
export function setTouchStart(x, y) { touchStartX = x; touchStartY = y; touchEndX = x; touchEndY = y; }
export function setTouchEnd(x, y) { touchEndX = x; touchEndY = y; }
export function setIsPotentialSwipe(potential) { isPotentialSwipe = potential; }
export function setIsDragging(dragging) { isDragging = dragging; }
export function setDragStart(x, y) { dragStartX = x; dragStartY = y; }
export function setInitialScroll(left, top) { initialScrollLeft = left; initialScrollTop = top; }
export function setDidDrag(dragged) { didDrag = dragged; }

export function reverseImageBlobs() { imageBlobs.reverse(); }
export function resetSwipeState() {
    isPotentialSwipe = false;
    touchStartX = 0; touchEndX = 0; touchStartY = 0; touchEndY = 0;
}
export function resetPanState() {
    isDragging = false;
    dragStartX = 0; dragStartY = 0;
    initialScrollLeft = 0; initialScrollTop = 0;
    // Keep didDrag until it's checked by click handler
}
export function resetAllState() {
    imageBlobs = []; originalImageBlobs = []; currentImageIndex = 0;
    currentObjectUrl = null; previousObjectUrl = null;
    fitMode = 'best'; isMangaModeActive = false; hudTimer = null;
    resetSwipeState();
    resetPanState();
    didDrag = false;
}