// js/comet-mouse-handler.js
import * as DOM from './comet-dom.js';
import * as State from './comet-state.js';
import * as UI from './comet-ui.js';
import * as Nav from './comet-navigation.js';

let isMouseDragging = false; // Mouse-specific dragging flag

/**
 * Handles the start of a mouse drag (pan).
 * @param {MouseEvent} event - The mouse event.
 */
function handleMouseDown(event) {
    // Only proceed for the primary (left) mouse button
    if (event.button !== 0) {
        return;
    }

    // Only allow panning if the image is zoomed
    if (UI.isZoomed()) {
        isMouseDragging = true;
        State.setDragStart(event.clientX, event.clientY);
        State.setInitialScroll(DOM.imageContainer.scrollLeft, DOM.imageContainer.scrollTop);
        DOM.imageContainer.style.cursor = 'grabbing';
        State.setDidDrag(false); // Reset 'didDrag'
        event.preventDefault(); // Prevent text selection, etc.
    }
}

/**
 * Handles mouse movement during a drag (pan).
 * @param {MouseEvent} event - The mouse event.
 */
function handleMouseMove(event) {
    if (isMouseDragging) {
        const { dragStartX, dragStartY, initialScrollLeft, initialScrollTop } = State.getState();
        const deltaX = event.clientX - dragStartX;
        const deltaY = event.clientY - dragStartY;
        DOM.imageContainer.scrollLeft = initialScrollLeft - deltaX;
        DOM.imageContainer.scrollTop = initialScrollTop - deltaY;
        // If moved more than a few pixels, set the 'didDrag' flag
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            State.setDidDrag(true);
        }
        event.preventDefault(); // Prevent default actions during drag
    }
}

/**
 * Handles the end of a mouse drag (pan).
 * @param {MouseEvent} event - The mouse event.
 */
function handleMouseUpOrLeave(event) {
    if (isMouseDragging) {
        isMouseDragging = false;
        // Set cursor back to 'grab' if still zoomed, otherwise 'pointer'
        if (UI.isZoomed()) {
            DOM.imageContainer.style.cursor = 'grab';
        } else {
            DOM.imageContainer.style.cursor = 'pointer';
        }
    }
}

/**
 * Handles a mouse click on the image container.
 * This should ONLY fire if it wasn't a drag.
 * @param {MouseEvent} event - The mouse event.
 */
export function handleImageClick(event) {
    // If a drag just finished, reset the flag and do nothing.
    if (State.getState().didDrag) {
        State.setDidDrag(false);
        return;
    }

    // Ignore clicks if the menu is open
    if (DOM.menuPanel && DOM.menuPanel.classList.contains('visible')) return;

    // Ignore clicks on potential scrollbars (heuristic)
    const scrollbarWidth = 17;
    if (event.offsetX >= DOM.imageContainer.clientWidth - scrollbarWidth || event.offsetY >= DOM.imageContainer.clientHeight - scrollbarWidth) return;

    // Ignore clicks if they hit a HUD icon (let the HUD handle it)
    if (DOM.hudOverlay && DOM.hudOverlay.classList.contains('visible') && event.target.closest('.hud-icon')) {
         UI.showHUD(); // Keep HUD open if an icon is clicked
         return;
    }

    // If zoomed, a click should just toggle the HUD
    if (UI.isZoomed()) {
        UI.toggleHUD();
        return;
    }

    // If not zoomed, determine navigation or HUD toggle
    const rect = DOM.imageContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const containerWidth = DOM.imageContainer.clientWidth;
    const isManga = State.getState().isMangaModeActive;

    if (x < containerWidth * 0.25) { isManga ? Nav.nextPage() : Nav.prevPage(); }
    else if (x > containerWidth * 0.75) { isManga ? Nav.prevPage() : Nav.nextPage(); }
    else { UI.toggleHUD(); }
}

/**
 * Attaches all mouse-related event listeners.
 */
export function setupMouseListeners() {
    DOM.imageContainer?.addEventListener('mousedown', handleMouseDown);
    // Attach move/up/leave to the document to catch drags outside the container
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUpOrLeave);
    document.addEventListener('mouseleave', handleMouseUpOrLeave);
    // Keep the click listener on the container itself
    DOM.imageContainer?.addEventListener('click', handleImageClick);
}