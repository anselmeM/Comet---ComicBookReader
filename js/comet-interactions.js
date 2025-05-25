// js/comet-interactions.js
import * as DOM from './comet-dom.js';
import * as State from './comet-state.js';
import * as UI from './comet-ui.js';
import * as Nav from './comet-navigation.js';
import { handleFile } from './comet-file-handler.js';

// --- Pan Handlers ---
// ... (Existing handlePanStart, handlePanMove, handlePanEnd code - unchanged) ...
function handlePanStart(clientX, clientY) {
    if (UI.isZoomed()) {
        State.setIsDragging(true);
        State.setDragStart(clientX, clientY);
        State.setInitialScroll(DOM.imageContainer.scrollLeft, DOM.imageContainer.scrollTop);
        DOM.imageContainer.style.cursor = 'grabbing';
        State.setDidDrag(false);
        return true;
    }
    return false;
}

function handlePanMove(clientX, clientY) {
    if (State.getState().isDragging) {
        const { dragStartX, dragStartY, initialScrollLeft, initialScrollTop } = State.getState();
        const deltaX = clientX - dragStartX;
        const deltaY = clientY - dragStartY;
        DOM.imageContainer.scrollLeft = initialScrollLeft - deltaX;
        DOM.imageContainer.scrollTop = initialScrollTop - deltaY;
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            State.setDidDrag(true);
        }
        return true;
    }
    return false;
}

function handlePanEnd() {
    if (State.getState().isDragging) {
        State.setIsDragging(false);
        if (UI.isZoomed()) {
            DOM.imageContainer.style.cursor = 'grab';
        } else {
            DOM.imageContainer.style.cursor = 'pointer';
        }
        return true;
    }
    return false;
}


// --- NEW: Single Tap and Double Tap Handlers ---

/**
 * Handles the double-tap action.
 * Toggles between 'best' fit mode and 'original' size mode.
 * @param {TouchEvent} event - The touch event (optional, might be needed for zoom-to-point later).
 */
function handleDoubleTap(event) {
    console.log("Double Tap Detected!");
    if (UI.isZoomed()) {
        UI.applyFitMode('best');
    } else {
        // Zoom to original size or a fixed factor (e.g., 2.5x)
        // 'original' might be too big sometimes, let's try a fixed zoom first.
        // We might want to enhance this later to zoom towards event.clientX/Y
        UI.changeZoom(2.5);
    }
    // Prevent this from also triggering a click or single tap
    State.setDidDrag(true); // Use didDrag flag to suppress potential clicks
}

/**
 * Handles the single-tap action (navigation or HUD toggle).
 * This is called after a delay to ensure it wasn't a double tap.
 * @param {Object} tapCoords - The coordinates {x, y} of the tap.
 */
function handleSingleTap(tapCoords) {
    console.log("Single Tap Detected!");
    // Ensure menu isn't visible and it wasn't a drag
    if (DOM.menuPanel && DOM.menuPanel.classList.contains('visible')) return;
    if (State.getState().didDrag) { State.setDidDrag(false); return; }

    // If zoomed, a single tap *only* toggles the HUD
    if (UI.isZoomed()) {
        UI.toggleHUD();
        return;
    }

    // If not zoomed, check tap position for navigation or HUD
    const rect = DOM.imageContainer.getBoundingClientRect();
    const x = tapCoords.x - rect.left;
    const containerWidth = DOM.imageContainer.clientWidth;
    const isManga = State.getState().isMangaModeActive;

    if (x < containerWidth * 0.25) { isManga ? Nav.nextPage() : Nav.prevPage(); }
    else if (x > containerWidth * 0.75) { isManga ? Nav.prevPage() : Nav.nextPage(); }
    else { UI.toggleHUD(); }
}


// --- REVISED: Touch Handlers (Swipe, Pan, Taps) ---

/**
 * Records the starting point for touch interactions (pan or swipe).
 * @param {TouchEvent} event - The touch event.
 */
function handleTouchStart(event) {
    // We only handle single-finger touches for these interactions
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        // If zoomed, prioritize panning.
        if (!handlePanStart(touch.clientX, touch.clientY)) {
            // If not panning, it might be a swipe or tap. Record start.
            State.setTouchStart(touch.clientX, touch.clientY);
            State.setIsPotentialSwipe(true); // It could be a swipe...
            State.setDidDrag(false); // ...or a tap (not a drag yet)
        } else {
            // If panning *did* start, it's not a swipe and it *is* a drag.
            State.setIsPotentialSwipe(false);
            State.setDidDrag(true); // Mark as drag initiated
        }
        // Always prevent default if we might pan or swipe, helps avoid conflicts.
        // event.preventDefault(); // Be careful: this can prevent clicks too. Let's try move.
    }
}

/**
 * Tracks touch movement for panning or swiping.
 * @param {TouchEvent} event - The touch event.
 */
function handleTouchMove(event) {
    // Only track if a single finger is down
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        // If we are currently in 'dragging' mode (panning)
        if (handlePanMove(touch.clientX, touch.clientY)) {
            event.preventDefault(); // Prevent page scroll *only* when panning.
        }
        // If it's not a pan but could be a swipe
        else if (State.getState().isPotentialSwipe) {
            State.setTouchEnd(touch.clientX, touch.clientY);
            const { touchStartX, touchEndX, touchStartY, touchEndY } = State.getState();
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            // If it looks more like a horizontal swipe, prevent default scroll.
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                event.preventDefault();
            }
            // If movement is significant, it's not a 'tap', so cancel potential single tap
            if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                 State.clearTapTimeout();
                 State.setLastTapTime(0); // Reset tap time if it turns into a drag/swipe
                 State.setDidDrag(true); // Consider it a drag/swipe, not a tap.
            }
        }
    }
}

/**
 * Determines the final action when a touch ends: Pan, Swipe, Double Tap, or Single Tap.
 * @param {TouchEvent} event - The touch event.
 */
function handleTouchEnd(event) {
    const { isPotentialSwipe, lastTapTime, tapTimeout } = State.getState();
    const currentTime = new Date().getTime();
    const touch = event.changedTouches[0]; // Get coords of the finger that was lifted

    // 1. Was it a Pan?
    if (handlePanEnd()) {
        // Panning finished. If didDrag is true, click/tap won't fire.
        // We reset isPotentialSwipe just in case.
        State.setIsPotentialSwipe(false);
        return; // Don't process further as swipe or tap
    }

    // 2. Was it a Swipe?
    if (isPotentialSwipe) {
        const { touchStartX, touchEndX, touchStartY, touchEndY, isMangaModeActive } = State.getState();
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // Check if it meets swipe criteria (and wasn't just a small drag)
        if (Math.abs(deltaX) > State.SWIPE_THRESHOLD && Math.abs(deltaY) < State.VERTICAL_THRESHOLD) {
            // It's a swipe!
            console.log("Swipe Detected!");
            if (deltaX < 0) { isMangaModeActive ? Nav.prevPage() : Nav.nextPage(); }
            else { isMangaModeActive ? Nav.nextPage() : Nav.prevPage(); }
            State.resetSwipeState();
            State.setLastTapTime(0); // A swipe isn't a tap
            State.clearTapTimeout(); // Cancel any pending single tap
            State.setDidDrag(true); // Prevent accidental click firing
            return; // Action handled
        }
    }

    // 3. If not a Pan or Swipe, it's a Tap. Is it a Double Tap?
    // We check if didDrag is false - only treat it as a tap if no dragging occurred.
    if (!State.getState().didDrag) {
        if ((currentTime - lastTapTime) < State.DOUBLE_TAP_DELAY) {
            // It's a Double Tap!
            State.clearTapTimeout(); // Cancel the pending single tap from the first tap
            State.setLastTapTime(0);   // Reset tap time
            handleDoubleTap(event);    // Perform double tap action
            event.preventDefault();    // Prevent potential zoom or click events
            return; // Action handled
        }
    }

    // 4. If not Pan, Swipe, or Double Tap, it must be a (potential) Single Tap.
    // Only schedule a single tap if it wasn't a drag.
    if (!State.getState().didDrag) {
        State.setLastTapTime(currentTime); // Record time for potential double tap
        // We need coordinates for the single tap action
        const tapCoords = { x: touch.clientX, y: touch.clientY };
        // Schedule the single tap action. It will only run if not cleared by a double tap.
        State.setTapTimeout(setTimeout(() => {
            handleSingleTap(tapCoords); // Perform single tap
            State.setLastTapTime(0);    // Reset after timeout
        }, State.DOUBLE_TAP_DELAY));
    }

    // 5. Reset states for the next interaction
    State.resetSwipeState();
    // Don't reset didDrag here, let the click/singleTap handler do it.
}


// --- Click Handler (Mainly for Mouse Users now) ---
function handleImageContainerClick(event) {
    // If a drag, swipe, or touch tap just happened, don't process click.
    if (State.getState().didDrag) {
        State.setDidDrag(false); // Reset flag and ignore click
        return;
    }
    // Check if a single tap is pending, if so, maybe ignore click?
    // This is tricky. For now, let's allow clicks but prioritize touch.
    // The main tap logic is now in handleSingleTap via handleTouchEnd.
    // This click handler will mostly serve mouse users.
    // For mouse users, we can just call handleSingleTap directly.
    console.log("Click Detected (Mouse?)");
    handleSingleTap({ x: event.clientX, y: event.clientY });
}

// --- Keydown Handler ---
// ... (Existing handleKeyDown code - unchanged) ...
function handleKeyDown(e) {
    if (DOM.readerViewElement && DOM.readerViewElement.classList.contains('active')) {
        if (DOM.menuPanel && DOM.menuPanel.classList.contains('visible')) {
            if (e.key === 'Escape') UI.hideMenuPanel(); return;
        }
        let handled = false;
        const isManga = State.getState().isMangaModeActive;
        if (e.key === 'ArrowLeft') { isManga ? Nav.nextPage() : Nav.prevPage(); handled = true; }
        else if (e.key === 'ArrowRight') { isManga ? Nav.prevPage() : Nav.nextPage(); handled = true; }
        else if (e.key === ' ') { UI.toggleHUD(); handled = true; e.preventDefault(); }
        else if (e.key === '+' || e.key === '=') { UI.changeZoom(State.ZOOM_STEP); handled = true; }
        else if (e.key === '-') { UI.changeZoom(1 / State.ZOOM_STEP); handled = true; }
        else if (e.key.toLowerCase() === 'm') { if (DOM.mangaModeToggle) { DOM.mangaModeToggle.checked = !DOM.mangaModeToggle.checked; UI.applyMangaMode(); } handled = true; }
        if (handled) e.preventDefault();
    }
}


// --- Setup Function ---
export function setupEventListeners() {
    // ... (Existing file/drop listeners - unchanged) ...
    DOM.selectFileButton?.addEventListener('click', () => DOM.fileInput.click());
    DOM.uploadButtonHeader?.addEventListener('click', () => DOM.fileInput.click());
    DOM.uploadButtonHeaderMobile?.addEventListener('click', () => DOM.fileInput.click());
    DOM.fileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) { handleFile(e.target.files[0]); e.target.value = ''; }
    });
    DOM.dropZone?.addEventListener('dragover', (e) => { e.preventDefault(); DOM.dropZone.classList.add('dragging'); });
    DOM.dropZone?.addEventListener('dragleave', (e) => { e.preventDefault(); DOM.dropZone.classList.remove('dragging'); });
    DOM.dropZone?.addEventListener('drop', (e) => { e.preventDefault(); DOM.dropZone.classList.remove('dragging'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });


    // Image Container (Click, Touch, Mouse Pan) - Click listener modified
    DOM.imageContainer?.addEventListener('click', handleImageContainerClick); // Now mostly for mouse
    DOM.imageContainer?.addEventListener('touchstart', handleTouchStart, { passive: false });
    DOM.imageContainer?.addEventListener('touchmove', handleTouchMove, { passive: false });
    DOM.imageContainer?.addEventListener('touchend', handleTouchEnd);
    DOM.imageContainer?.addEventListener('touchcancel', handleTouchEnd); // Treat cancel like end
    DOM.imageContainer?.addEventListener('mousedown', (e) => { if (e.button === 0 && handlePanStart(e.clientX, e.clientY)) e.preventDefault(); });
    document.addEventListener('mousemove', (e) => { if (handlePanMove(e.clientX, e.clientY)) e.preventDefault(); });
    document.addEventListener('mouseup', handlePanEnd);
    document.addEventListener('mouseleave', handlePanEnd);

    // ... (Existing HUD/Menu listeners - unchanged) ...
    DOM.hudOverlay?.addEventListener('click', (e) => { if (DOM.hudOverlay.classList.contains('visible') && e.target === DOM.hudOverlay) { UI.hideHUD(0); e.stopPropagation(); } });
    DOM.backButton?.addEventListener('click', UI.showUploadView);
    DOM.menuButton?.addEventListener('click', UI.showMenuPanel);
    DOM.closeMenuButton?.addEventListener('click', UI.hideMenuPanel);
    DOM.mangaModeToggle?.addEventListener('change', UI.applyMangaMode);
    DOM.zoomInButtonPanel?.addEventListener('click', () => UI.changeZoom(State.ZOOM_STEP));
    DOM.zoomOutButtonPanel?.addEventListener('click', () => UI.changeZoom(1 / State.ZOOM_STEP));
    DOM.fitLabels?.forEach(label => { const radio = label.querySelector('input'); if (radio) label.addEventListener('click', () => UI.applyFitMode(radio.value)); });


    // Global Keydown
    document.addEventListener('keydown', handleKeyDown);
}