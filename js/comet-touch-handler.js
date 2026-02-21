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
    // Deprecated for zoomed state in favor of native scrolling
    // Kept if needed for other contexts, but effectively unused if we allow native scroll
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

    // If zoomed, we want to allow native scrolling.
    // We DON'T preventDefault here.
    // We still track startX/Y to detect taps vs scrolls.
}

function handleTouchMove(event) {
    // Only act if we started with a single touch and are in a 'DOWN' or 'MOVING' state
    if (event.touches.length !== 1 || (touchState !== 'DOWN' && touchState !== 'SWIPING')) {
        return;
    }

    const touch = event.touches[0];
    currentX = touch.clientX;
    currentY = touch.clientY;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    // If zoomed, let the browser handle scrolling (native momentum)
    if (UI.isZoomed()) {
        // We do NOT preventDefault.
        // We do NOT enter 'PANNING' state (we stay in DOWN or transition to a pseudo-scroll state if we wanted to track it)
        // If the user moves significantly, we assume it's a scroll, so it's NOT a tap.
        if (Math.abs(deltaX) > TAP_THRESHOLD || Math.abs(deltaY) > TAP_THRESHOLD) {
            touchState = 'SCROLLING_NATIVE';
        }
        return;
    }

    // If NOT zoomed, logic for swiping pages
    if (touchState === 'DOWN') {
        if (Math.abs(deltaX) > TAP_THRESHOLD || Math.abs(deltaY) > TAP_THRESHOLD) {
            // If horizontal movement is dominant, start swiping
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                touchState = 'SWIPING';
            } else {
                // Vertical movement when NOT zoomed?
                // Probably just ignore or let native vertical scroll happen if applicable
                // But typically fit-to-screen has no vertical scroll.
                touchState = 'IDLE';
                return;
            }
        } else {
            return; // Waiting for threshold
        }
    }

    if (touchState === 'SWIPING') {
        event.preventDefault(); // Prevent browser nav gestures
    }
}

function handleTouchEnd(event) {
    // If we were native scrolling, we just reset and exit.
    if (touchState === 'SCROLLING_NATIVE') {
        touchState = 'IDLE';
        return;
    }

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

    // 1. Was it Swiping?
    if (currentState === 'SWIPING') {
        if (Math.abs(deltaX) > State.SWIPE_THRESHOLD && Math.abs(deltaY) < State.VERTICAL_THRESHOLD) {
            doSwipe(deltaX < 0 ? 'left' : 'right');
            event.preventDefault();
            lastTapTime = 0; // A swipe resets double tap tracking
            return;
        }
    }

    // 2. Was it a Tap? (State was 'DOWN' and we didn't move enough to scroll/swipe)
    // Note: If we are zoomed, 'SCROLLING_NATIVE' handles the case where we moved.
    // So if we are still in 'DOWN', it means we didn't move much -> Tap.
    if (currentState === 'DOWN' && Math.abs(deltaX) <= TAP_THRESHOLD && Math.abs(deltaY) <= TAP_THRESHOLD) {
        // If preventing default on touchEnd is necessary to prevent ghost clicks:
        if (event.cancelable) event.preventDefault();

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
