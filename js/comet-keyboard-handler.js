// js/comet-keyboard-handler.js
import * as DOM from './comet-dom.js';
import * as State from './comet-state.js';
import * as UI from './comet-ui.js';
import * as Nav from './comet-navigation.js';
import { toggleBookmark } from './comet-bookmarks.js';

/**
 * Handles keydown events when the reader view is active.
 * @param {KeyboardEvent} event - The keyboard event.
 */
export function handleKeyDown(event) {
    // Only process if the reader view is active
    if (!DOM.readerViewElement || !DOM.readerViewElement.classList.contains('active')) {
        return;
    }

    // If the menu panel is visible, handle Escape + Tab focus trap
    if (DOM.menuPanel && DOM.menuPanel.classList.contains('visible')) {
        if (event.key === 'Escape') {
            UI.hideMenuPanel();
            event.preventDefault();
        } else if (event.key === 'Tab') {
            const focusable = [...DOM.menuPanel.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )].filter(el => el.offsetParent !== null);
            if (focusable.length > 0) {
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    last.focus(); event.preventDefault();
                } else if (!event.shiftKey && document.activeElement === last) {
                    first.focus(); event.preventDefault();
                }
            }
        }
        return;
    }

    let handled = false;
    const isManga = State.getState().isMangaModeActive;

    switch (event.key) {
        case 'ArrowLeft':
            isManga ? Nav.nextPage() : Nav.prevPage();
            handled = true;
            break;
        case 'ArrowRight':
            isManga ? Nav.prevPage() : Nav.nextPage();
            handled = true;
            break;
        case ' ': // Space bar
            UI.toggleHUD();
            handled = true;
            break;
        case '+':
        case '=': // Plus or Equals (often used for zoom in)
            UI.changeZoom(State.ZOOM_STEP);
            handled = true;
            break;
        case '-':
        case '_': // Minus or Underscore
            UI.changeZoom(1 / State.ZOOM_STEP);
            handled = true;
            break;
        case 'm':
        case 'M':
            if (DOM.mangaModeToggle) {
                DOM.mangaModeToggle.checked = !DOM.mangaModeToggle.checked;
                UI.applyMangaMode();
            }
            handled = true;
            break;
        case 'f': // Add 'f' for 'best' fit maybe?
        case 'F':
            UI.applyFitMode('best');
            handled = true;
            break;
        case 'b':
        case 'B': {
            const fileKey = State.getCurrentFileKey();
            if (fileKey) {
                const { currentImageIndex } = State.getState();
                toggleBookmark(fileKey, currentImageIndex);
                UI.updateBookmarkIndicator(currentImageIndex);
                UI.renderBookmarkList();
            }
            handled = true;
            break;
        }
    }

    // If we handled the key, prevent its default action (like scrolling)
    if (handled) {
        event.preventDefault();
    }
}