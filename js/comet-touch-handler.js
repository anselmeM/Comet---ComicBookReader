// js/comet-touch-handler.js
import * as DOM from './comet-dom.js';
import * as State from './comet-state.js';
import * as UI from './comet-ui.js';
import * as Nav from './comet-navigation.js';
import { UI as UI_CONSTANTS } from './comet-constants.js';

// --- Touch State ---
let touchState = 'IDLE'; // Possible states: IDLE, DOWN, PANNING, SWIPING
let startX = 0, startY = 0, startTime = 0;
let currentX = 0, currentY = 0;
let initialScrollLeft = 0, initialScrollTop = 0;
let singleTapTimeout = null;
let lastTapTime = 0;

const TAP_THRESHOLD = UI_CONSTANTS.TAP_THRESHOLD;

// --- Action Handlers ---

function doDoubleTap() {
    if (UI.isZoomed()) {
        UI.applyFitMode('best');
    } else {
        UI.changeZoom(2.5);
    }
}

function doSingleTap(coords) {
    if (DOM.menuPanel && DOM.menuPanel.classList.contains('visible')) return;
    if (UI.isZoomed()) {
        UI.toggleHUD();
        return;
    }
    const rect = DOM.imageContainer.getBoundingClientRect();
    const x = coords.x - rect.left;
    const containerWidth = DOM.imageContainer.clientWidth;
    const isManga = State.getState().isMangaModeActive;

    if (x < containerWidth * 0.25) { isManga ? Nav.nextPage() : Nav.prevPage(); }
    else if (x > containerWidth * 0.75) { isManga ? Nav.prevPage() : Nav.nextPage(); }
    else { UI.toggleHUD(); }
}

function doSwipe(direction) {
    const isManga = State.getState().isMangaModeActive;
    if (direction === 'left') {
        isManga ? Nav.prevPage() : Nav.nextPage();
    } else {
        isManga ? Nav.nextPage() : Nav.prevPage();
    }
}

function doPan(deltaX, deltaY) {
    DOM.imageContainer.scrollLeft = initialScrollLeft - deltaX;
    DOM.imageContainer.scrollTop = initialScrollTop - deltaY;
}

// --- Touch Event Listeners ---

function handleTouchStart(event) {
    // Ignore multi-touch for now (prevents issues with pinch-zoom later)
    if (event.touches.length !== 1) {
        touchState = 'IDLE';
        return;
    }

    // Clear any pending single tap from previous interactions
    clearTimeout(singleTapTimeout);
    singleTapTimeout = null;

    const touch = event.touches[0];
    startX = currentX = touch.clientX;
    startY = currentY = touch.clientY;
    startTime = new Date().getTime();
    touchState = 'DOWN';

    // If zoomed, prepare for potential panning
    if (UI.isZoomed()) {
        initialScrollLeft = DOM.imageContainer.scrollLeft;
        initialScrollTop = DOM.imageContainer.scrollTop;
    }
    // Don't preventDefault yet, allow potential 'click' unless we move
}

function handleTouchMove(event) {
    // Only act if we started with a single touch and are in a 'DOWN' or 'MOVING' state
    if (event.touches.length !== 1 || (touchState !== 'DOWN' && touchState !== 'PANNING' && touchState !== 'SWIPING')) {
        return;
    }

    const touch = event.touches[0];
    currentX = touch.clientX;
    currentY = touch.clientY;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    // If we are in 'DOWN' state, decide if we start panning or swiping
    if (touchState === 'DOWN') {
        // If moved beyond the tap threshold
        if (Math.abs(deltaX) > TAP_THRESHOLD || Math.abs(deltaY) > TAP_THRESHOLD) {
            // If zoomed, prioritize panning
            if (UI.isZoomed()) {
                touchState = 'PANNING';
                DOM.imageContainer.style.cursor = 'grabbing'; // Visual feedback
            }
            // If not zoomed, and horizontal movement is dominant, start swiping
            else if (Math.abs(deltaX) > Math.abs(deltaY)) {
                touchState = 'SWIPING';
            }
            // If not zoomed and vertical movement is dominant, let the browser scroll
            else {
                touchState = 'IDLE';
                return;
            }
        } else {
            return; // Not moved enough yet, wait.
        }
    }

    // If we are panning, update scroll and prevent default
    if (touchState === 'PANNING') {
        doPan(deltaX, deltaY);
        event.preventDefault();
    }
    // If we are swiping, prevent default (we'll act on touchend)
    else if (touchState === 'SWIPING') {
        event.preventDefault();
    }
}

function handleTouchEnd(event) {
    if (touchState === 'IDLE') {
        return;
    }

    const endTime = new Date().getTime();
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    // Get the state *before* resetting
    const currentState = touchState;
    // Always reset state on touch end
    touchState = 'IDLE';
    DOM.imageContainer.style.cursor = UI.isZoomed() ? 'grab' : 'pointer';

    // --- Decide the Action ---

    // 1. Was it Panning?
    if (currentState === 'PANNING') {
        event.preventDefault(); // Ensure click is stopped after pan
        return;
    }

    // 2. Was it Swiping?
    if (currentState === 'SWIPING') {
        if (Math.abs(deltaX) > State.SWIPE_THRESHOLD && Math.abs(deltaY) < State.VERTICAL_THRESHOLD) {
            doSwipe(deltaX < 0 ? 'left' : 'right');
            event.preventDefault();
            lastTapTime = 0; // A swipe resets double tap tracking
            return;
        }
        // If it didn't meet swipe criteria, it might have been a tap - fall through.
    }

    // 3. Was it a Tap? (State was 'DOWN' or an invalid 'SWIPING')
    if (Math.abs(deltaX) <= TAP_THRESHOLD && Math.abs(deltaY) <= TAP_THRESHOLD) {
        event.preventDefault(); // Prevent ghost clicks

        if ((endTime - lastTapTime) < State.DOUBLE_TAP_DELAY) {
            // DOUBLE TAP
            clearTimeout(singleTapTimeout);
            singleTapTimeout = null;
            lastTapTime = 0;
            doDoubleTap();
        } else {
            // SINGLE TAP — schedule it
            lastTapTime = endTime;
            const tapCoords = { x: currentX, y: currentY };
            singleTapTimeout = setTimeout(() => {
                if (lastTapTime !== 0) {
                    doSingleTap(tapCoords);
                    lastTapTime = 0;
                }
            }, State.DOUBLE_TAP_DELAY + 50);
        }
        return;
    }

    // Invalid gesture — do nothing.
}


/**
 * Attaches all touch-related event listeners.
 */
export function setupTouchListeners() {
    DOM.imageContainer?.addEventListener('touchstart', handleTouchStart, { passive: false });
    DOM.imageContainer?.addEventListener('touchmove', handleTouchMove, { passive: false });
    DOM.imageContainer?.addEventListener('touchend', handleTouchEnd, { passive: false });
    DOM.imageContainer?.addEventListener('touchcancel', handleTouchEnd, { passive: false });
}
