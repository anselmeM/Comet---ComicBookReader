// js/comet-interactions.js
import * as DOM from './comet-dom.js';
import * as State from './comet-state.js';
import * as UI from './comet-ui.js';
import * as Nav from './comet-navigation.js';
import { handleFile } from './comet-file-handler.js';

// --- Pan Handlers ---
// ... (Unchanged) ...
function handlePanStart(clientX, clientY) {
    if (UI.isZoomed()) {
        State.setIsDragging(true);
        State.setDragStart(clientX, clientY);
        State.setInitialScroll(DOM.imageContainer.scrollLeft, DOM.imageContainer.scrollTop);
        DOM.imageContainer.style.cursor = 'grabbing';
        State.setDidDrag(false); // Reset on new pan start
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
            State.setDidDrag(true); // Set true ONLY if actual movement occurs
        }
        return true;
    }
    return false;
}
function handlePanEnd() {
    if (State.getState().isDragging) {
        State.setIsDragging(false);
        if (UI.isZoomed()) { DOM.imageContainer.style.cursor = 'grab'; }
        else { DOM.imageContainer.style.cursor = 'pointer'; }
        return true; // Return true only if a drag was in progress
    }
    return false;
}

// --- Tap Handlers ---
// ... (Unchanged) ...
function handleDoubleTap(event) {
    console.log("Double Tap Action!");
    if (UI.isZoomed()) {
        UI.applyFitMode('best');
    } else {
        UI.changeZoom(2.5);
    }
    // No need to set didDrag here, preventDefault should stop clicks.
}
function handleSingleTap(tapCoords) {
    console.log("Single Tap Action!");
    if (DOM.menuPanel && DOM.menuPanel.classList.contains('visible')) return;

    // IMPORTANT: Check if a double tap *just* happened.
    // Since single tap runs on a delay, a double tap might occur,
    // but the single tap timeout might still fire. We check lastTapTime.
    // If it's 0, it means a double tap reset it, so we shouldn't act.
    if (State.getState().lastTapTime === 0) {
        console.log("Single tap ignored (likely a double tap occurred).");
        return;
    }

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


// --- Touch Handlers ---
// ... (handleTouchStart is unchanged) ...
function handleTouchStart(event) {
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        if (!handlePanStart(touch.clientX, touch.clientY)) {
            State.setTouchStart(touch.clientX, touch.clientY);
            State.setIsPotentialSwipe(true);
            State.setDidDrag(false);
        } else {
            State.setIsPotentialSwipe(false);
            State.setDidDrag(true);
        }
    }
}
// ... (handleTouchMove is largely unchanged, added preventDefault on move) ...
function handleTouchMove(event) {
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        if (handlePanMove(touch.clientX, touch.clientY)) {
            event.preventDefault();
        } else if (State.getState().isPotentialSwipe) {
            State.setTouchEnd(touch.clientX, touch.clientY);
            const { touchStartX, touchEndX, touchStartY, touchEndY } = State.getState();
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                event.preventDefault(); // Prevent vertical scroll on horizontal swipe.
            }
            if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                State.clearTapTimeout(); // Cancel any tap if movement starts.
                State.setLastTapTime(0);
                State.setDidDrag(true); // It's now a drag/swipe.
            }
        }
    }
}

// --- REVISED: handleTouchEnd ---
function handleTouchEnd(event) {
    const { isPotentialSwipe, lastTapTime, tapTimeout } = State.getState();
    const currentTime = new Date().getTime();
    const touch = event.changedTouches[0];

    const wasDragging = State.getState().isDragging; // Check if it *was* dragging
    const didPanEnd = handlePanEnd(); // End pan *first*

    // If it *was* dragging and *did* move (didDrag=true), stop here.
    if (wasDragging && State.getState().didDrag) {
        console.log("TouchEnd: Pan with drag occurred, stopping.");
        State.resetSwipeState();
        event.preventDefault(); // Prevent click after pan
        return;
    }

    // If it wasn't a pan OR it was a pan without significant movement,
    // it might be a swipe or tap. Check for swipe.
    if (isPotentialSwipe) {
        const { touchStartX, touchEndX, touchStartY, touchEndY, isMangaModeActive } = State.getState();
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        if (Math.abs(deltaX) > State.SWIPE_THRESHOLD && Math.abs(deltaY) < State.VERTICAL_THRESHOLD) {
            console.log("TouchEnd: Swipe Detected!");
            if (deltaX < 0) { isMangaModeActive ? Nav.prevPage() : Nav.nextPage(); }
            else { isMangaModeActive ? Nav.nextPage() : Nav.prevPage(); }
            State.resetSwipeState();
            State.setLastTapTime(0);
            State.clearTapTimeout();
            event.preventDefault(); // Prevent click after swipe
            return;
        }
    }

    // If it wasn't a pan with movement and wasn't a swipe, it's a tap.
    // We MUST prevent default here to stop unwanted clicks/zooms.
    event.preventDefault();
    console.log("TouchEnd: Processing as Tap...");

    // Is it a Double Tap?
    if ((currentTime - lastTapTime) < State.DOUBLE_TAP_DELAY) {
        console.log("TouchEnd: Double Tap Confirmed!");
        State.clearTapTimeout();
        State.setLastTapTime(0);
        handleDoubleTap(event);
    } else {
        // It's a Single Tap. Schedule it.
        console.log("TouchEnd: Scheduling Single Tap...");
        State.setLastTapTime(currentTime);
        const tapCoords = { x: touch.clientX, y: touch.clientY };
        State.setTapTimeout(setTimeout(() => {
            handleSingleTap(tapCoords);
            // Reset lastTapTime only *after* the single tap runs or is cancelled.
            // But if it *does* run, it should be 0 so the *next* tap isn't a double.
            // Let's ensure single tap resets it unless it was already reset by double-tap.
            if(State.getState().lastTapTime !== 0) {
                 State.setLastTapTime(0);
            }
        }, State.DOUBLE_TAP_DELAY));
    }

    // Reset swipe state regardless, as it's now a tap.
    State.resetSwipeState();
}


// --- Click Handler (Mainly for Mouse) ---
function handleImageContainerClick(event) {
    // Check if the click was likely triggered by a touch event
    // we already handled. If lastTapTime was set recently, ignore click.
    // This is a bit heuristic. A more robust way might be needed,
    // but preventDefault in touchend should ideally stop this.
    const timeSinceLastTap = new Date().getTime() - State.getState().lastTapTime;
    if (timeSinceLastTap < State.DOUBLE_TAP_DELAY * 1.5) {
         console.log("Click ignored (likely touch event).");
         return;
    }

    // If a mouse drag happened, ignore click.
    if (State.getState().didDrag) {
        State.setDidDrag(false);
        return;
    }

    console.log("Click Detected (Mouse?)");
    // Directly call single tap logic for mouse.
    handleSingleTap({ x: event.clientX, y: event.clientY });
}

// --- Keydown Handler ---
// ... (Unchanged) ...
function handleKeyDown(e) { /* ... */ }

// --- Setup Function ---
// ... (Unchanged, but ensure event listeners are correctly set up) ...
export function setupEventListeners() {
    // ... (File/Drop Listeners) ...
    DOM.selectFileButton?.addEventListener('click', () => DOM.fileInput.click());
    DOM.uploadButtonHeader?.addEventListener('click', () => DOM.fileInput.click());
    DOM.uploadButtonHeaderMobile?.addEventListener('click', () => DOM.fileInput.click());
    DOM.fileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) { handleFile(e.target.files[0]); e.target.value = ''; }
    });
    DOM.dropZone?.addEventListener('dragover', (e) => { e.preventDefault(); DOM.dropZone.classList.add('dragging'); });
    DOM.dropZone?.addEventListener('dragleave', (e) => { e.preventDefault(); DOM.dropZone.classList.remove('dragging'); });
    DOM.dropZone?.addEventListener('drop', (e) => { e.preventDefault(); DOM.dropZone.classList.remove('dragging'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });

    // Image Container
    DOM.imageContainer?.addEventListener('click', handleImageContainerClick);
    DOM.imageContainer?.addEventListener('touchstart', handleTouchStart, { passive: false });
    DOM.imageContainer?.addEventListener('touchmove', handleTouchMove, { passive: false });
    DOM.imageContainer?.addEventListener('touchend', handleTouchEnd); // Keep passive:true IF preventDefault is NOT called inside OR its ancestors
    DOM.imageContainer?.addEventListener('touchcancel', handleTouchEnd);
    DOM.imageContainer?.addEventListener('mousedown', (e) => { if (e.button === 0) { handlePanStart(e.clientX, e.clientY); e.preventDefault();} }); // Prevent default on mousedown only if panning starts
    document.addEventListener('mousemove', (e) => { if (handlePanMove(e.clientX, e.clientY)) e.preventDefault(); });
    document.addEventListener('mouseup', handlePanEnd);
    document.addEventListener('mouseleave', handlePanEnd);

    // ... (HUD/Menu Listeners) ...
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