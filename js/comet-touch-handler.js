// js/comet-touch-handler.js
import * as DOM from './comet-dom.js';
import * as State from './comet-state.js';
import * as UI from './comet-ui.js';
import * as Nav from './comet-navigation.js';

// --- Touch State ---
let touchState = 'IDLE'; // Possible states: IDLE, DOWN, PANNING, SWIPING
let startX = 0, startY = 0, startTime = 0;
let currentX = 0, currentY = 0;
let initialScrollLeft = 0, initialScrollTop = 0;
let singleTapTimeout = null;
let lastTapTime = 0;

const TAP_THRESHOLD = 10; // Max pixels moved to still be a tap
const DOUBLE_TAP_DELAY = 300; // ms for double tap

// --- Action Handlers ---

function doDoubleTap() {
    console.log("Action: Double Tap");
    if (UI.isZoomed()) {
        UI.applyFitMode('best');
    } else {
        UI.changeZoom(2.5);
    }
}

function doSingleTap(coords) {
    console.log("Action: Single Tap");
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
    console.log("Action: Swipe", direction);
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
    touchState = 'DOWN'; // Set state to 'DOWN'

    console.log("Touch Start:", startX, startY);

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
                console.log("Touch Move: Starting PAN");
                touchState = 'PANNING';
                DOM.imageContainer.style.cursor = 'grabbing'; // Visual feedback
            }
            // If not zoomed, and horizontal movement is dominant, start swiping
            else if (Math.abs(deltaX) > Math.abs(deltaY)) {
                console.log("Touch Move: Starting SWIPE");
                touchState = 'SWIPING';
            }
            // If not zoomed and vertical movement is dominant, let the browser scroll (don't preventDefault)
            else {
                 console.log("Touch Move: Vertical scroll - ignoring");
                 touchState = 'IDLE'; // Treat as ended to avoid issues
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
    // Ensure it's the end of our single touch sequence
    if (touchState === 'IDLE') {
        return;
    }

    const endTime = new Date().getTime();
    const duration = endTime - startTime;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    console.log("Touch End: State=", touchState, "dX=", deltaX, "dY=", deltaY);

    // Get the state *before* resetting
    const currentState = touchState;
    // Always reset state on touch end
    touchState = 'IDLE';
    DOM.imageContainer.style.cursor = UI.isZoomed() ? 'grab' : 'pointer';

    // --- Decide the Action ---

    // 1. Was it Panning?
    if (currentState === 'PANNING') {
        console.log("Touch End: Finalizing Pan");
        event.preventDefault(); // Ensure click is stopped after pan
        return;
    }

    // 2. Was it Swiping?
    if (currentState === 'SWIPING') {
        // Check if the swipe met the criteria
        if (Math.abs(deltaX) > State.SWIPE_THRESHOLD && Math.abs(deltaY) < State.VERTICAL_THRESHOLD) {
            console.log("Touch End: Finalizing Swipe");
            doSwipe(deltaX < 0 ? 'left' : 'right');
            event.preventDefault(); // Ensure click is stopped after swipe
            lastTapTime = 0; // A swipe resets double tap tracking
            return;
        }
        // If it didn't meet swipe criteria, it might have been a tap - fall through.
    }

    // 3. Was it a Tap? (State was 'DOWN' or an invalid 'SWIPING')
    // Check if movement was minimal
    if (Math.abs(deltaX) <= TAP_THRESHOLD && Math.abs(deltaY) <= TAP_THRESHOLD) {
         // It's a tap. Now check for double tap.
         console.log("Touch End: Processing Tap...");
         event.preventDefault(); // *Crucial* - Prevent ghost clicks!

         if ((endTime - lastTapTime) < DOUBLE_TAP_DELAY) {
             // DOUBLE TAP!
             console.log("Touch End: DOUBLE TAP!");
             clearTimeout(singleTapTimeout); // Cancel any pending single tap
             singleTapTimeout = null;
             lastTapTime = 0; // Reset tap time
             doDoubleTap();
         } else {
             // SINGLE TAP! Schedule it.
             console.log("Touch End: SINGLE TAP (pending)...");
             lastTapTime = endTime; // Record time for *next* potential tap
             const tapCoords = { x: currentX, y: currentY };
             singleTapTimeout = setTimeout(() => {
                 // Only run if not cancelled by a double tap
                 if (lastTapTime !== 0) { // Check if it wasn't reset
                     doSingleTap(tapCoords);
                     lastTapTime = 0; // Reset after it runs
                 }
             }, DOUBLE_TAP_DELAY + 50); // Add a small buffer to delay
         }
         return;
    }

    // If it wasn't a pan, swipe, or tap, it was likely an invalid gesture. Do nothing.
    console.log("Touch End: Invalid gesture, ignoring.");
}


/**
 * Attaches all touch-related event listeners.
 */
export function setupTouchListeners() {
    DOM.imageContainer?.addEventListener('touchstart', handleTouchStart, { passive: false });
    DOM.imageContainer?.addEventListener('touchmove', handleTouchMove, { passive: false });
    DOM.imageContainer?.addEventListener('touchend', handleTouchEnd, { passive: false });
    // It's good practice to handle cancel as well
    DOM.imageContainer?.addEventListener('touchcancel', handleTouchEnd, { passive: false });
}