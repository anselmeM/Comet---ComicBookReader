// js/comet-event-setup.js

// Import necessary DOM elements, UI functions, state variables, and specific event handlers.
// This modular approach keeps the codebase organized.
import * as DOM from './comet-dom.js';
import * as UI from './comet-ui.js';
import * as State from './comet-state.js';
import { handleFile } from './comet-file-handler.js';
import { handleKeyDown } from './comet-keyboard-handler.js';
import { setupMouseListeners } from './comet-mouse-handler.js';
import { setupTouchListeners } from './comet-touch-handler.js';
import { saveSettings } from './comet-settings.js';
import { toggleBookmark, clearBookmarks } from './comet-bookmarks.js';
import { makeFileKey } from './comet-progress.js';
import { storeHandle, openFileFromHandle, supportsFileSystemAccess } from './comet-library.js';

/**
 * Sets up all application-wide event listeners.
 * This function is intended to be called once during application initialization.
 * It delegates the setup of more specific event listeners (mouse, touch, keyboard)
 * to their respective handler modules.
 * Optional chaining (?.) is used for DOM elements to prevent errors if an element
 * is unexpectedly missing, though critical elements should be checked elsewhere (e.g., in comet-dom.js).
 */
export function setupEventListeners() {
    // Log to console for debugging or to confirm initialization.
    console.log("Setting up all event listeners...");

    // SECTION: File Input and Drop Zone Event Listeners

    // Select File button — use File System Access API when available, hidden input as fallback
    DOM.selectFileButton?.addEventListener('click', async () => {
        if (supportsFileSystemAccess) {
            try {
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Comic Files',
                        accept: { 'application/octet-stream': ['.cbz', '.cbr', '.pdf'] }
                    }],
                    multiple: false
                });
                const file = await fileHandle.getFile();
                const fileKey = makeFileKey(file);
                storeHandle(fileKey, fileHandle); // fire-and-forget — stores handle in IndexedDB
                handleFile(file);
            } catch (err) {
                if (err.name !== 'AbortError') console.error('File picker error:', err);
                // AbortError = user cancelled — silently ignore
            }
        } else {
            DOM.fileInput.click();
        }
    });

    // When the header upload button (desktop) is clicked, also trigger the hidden file input.
    DOM.uploadButtonHeader?.addEventListener('click', () => DOM.fileInput.click());

    // When the header upload button (mobile) is clicked:
    DOM.uploadButtonHeaderMobile?.addEventListener('click', () => {
        // First, check if the mobile menu is open.
        // This is specific UI logic to improve user experience on mobile.
        const mobMenu = document.getElementById('mobileMenu'); // Assumes 'mobileMenu' is the ID of the mobile menu container.
        const hamButton = document.getElementById('hamburgerButton'); // Assumes 'hamburgerButton' is the ID of the menu toggle button.

        // If the mobile menu and hamburger button exist and the menu is open:
        if (mobMenu && mobMenu.classList.contains('open') && hamButton) {
            // Close the mobile menu.
            mobMenu.classList.remove('open');
            // Update ARIA attributes for accessibility.
            hamButton.setAttribute('aria-expanded', 'false');
            // Change the hamburger icon back to its "closed" state (e.g., burger icon).
            // The SVG path data here represents a typical hamburger menu icon.
            hamButton.innerHTML = `<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>`;
        }
        // After potentially closing the menu, trigger the hidden file input.
        DOM.fileInput.click();
    });

    // When a file is selected via the file input element:
    DOM.fileInput?.addEventListener('change', (e) => {
        // Check if files were actually selected.
        if (e.target.files && e.target.files.length > 0) {
            // Pass the first selected file to the file handler.
            handleFile(e.target.files[0]);
            // Reset the file input's value. This allows the 'change' event to fire
            // again if the user selects the same file consecutively.
            e.target.value = '';
        }
    });

    // When an item is dragged over the drop zone:
    DOM.dropZone?.addEventListener('dragover', (e) => {
        e.preventDefault(); // Prevent default browser behavior (e.g., opening the file).
        DOM.dropZone.classList.add('dragging'); // Add a class for visual feedback (e.g., highlight the drop zone).
    });

    // When a dragged item leaves the drop zone:
    DOM.dropZone?.addEventListener('dragleave', (e) => {
        e.preventDefault(); // Prevent default browser behavior.
        DOM.dropZone.classList.remove('dragging'); // Remove the visual feedback class.
    });

    // When an item is dropped onto the drop zone:
    DOM.dropZone?.addEventListener('drop', async (e) => {
        e.preventDefault();
        DOM.dropZone.classList.remove('dragging');
        const item = e.dataTransfer.items?.[0];
        if (!item || item.kind !== 'file') return;

        // Prefer File System Access API (Chromium) to get a storable handle
        if (supportsFileSystemAccess && typeof item.getAsFileSystemHandle === 'function') {
            try {
                const handle = await item.getAsFileSystemHandle();
                if (handle && handle.kind === 'file') {
                    const file = await handle.getFile();
                    const fileKey = makeFileKey(file);
                    storeHandle(fileKey, handle); // persist for Library reopen
                    handleFile(file);
                    return;
                }
            } catch (err) {
                // Fallback if getAsFileSystemHandle fails unexpectedly
                console.warn('[drop] getAsFileSystemHandle failed, using fallback:', err);
            }
        }
        // Firefox / fallback: plain File object
        const file = item.getAsFile() ?? e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    // SECTION: HUD (Heads-Up Display) and Menu Event Listeners

    // When the HUD overlay is clicked:
    DOM.hudOverlay?.addEventListener('click', (e) => {
        // Hide the HUD only if it's currently visible AND the click target is the overlay itself
        // (not a child element within the overlay, like a button).
        if (DOM.hudOverlay.classList.contains('visible') && e.target === DOM.hudOverlay) {
            UI.hideHUD(0); // Hide HUD immediately (0ms delay).
            e.stopPropagation(); // Prevent the click from bubbling up to other elements (e.g., imageContainer).
        }
    });

    // When the 'Back' button (likely in the reader view) is clicked:
    // Show the upload view, allowing the user to select a new comic.
    DOM.backButton?.addEventListener('click', UI.showUploadView);

    // When the 'Menu' button (in the reader view) is clicked:
    // Display the menu panel.
    DOM.menuButton?.addEventListener('click', UI.showMenuPanel);

    // When the 'Close Menu' button (within the menu panel) is clicked:
    // Hide the menu panel.
    DOM.closeMenuButton?.addEventListener('click', UI.hideMenuPanel);

    // When the state of the 'Manga Mode' toggle changes:
    // Apply the selected manga mode (e.g., right-to-left reading).
    DOM.mangaModeToggle?.addEventListener('change', () => {
        UI.applyMangaMode();
        saveSettings({ mangaMode: DOM.mangaModeToggle.checked });
    });

    // When the state of the 'Two-Page Spread' toggle changes:
    DOM.twoPageToggle?.addEventListener('change', () => {
        UI.toggleTwoPageMode();
        saveSettings({ twoPage: DOM.twoPageToggle.checked });
    });

    // When the 'Zoom In' button in the panel is clicked:
    DOM.zoomInButtonPanel?.addEventListener('click', () => UI.changeZoom(State.ZOOM_STEP));

    // When the 'Zoom Out' button in the panel is clicked:
    DOM.zoomOutButtonPanel?.addEventListener('click', () => UI.changeZoom(1 / State.ZOOM_STEP));

    // For each 'fit-label' element:
    DOM.fitLabels?.forEach(label => {
        const radio = label.querySelector('input[type="radio"]');
        if (radio) {
            label.addEventListener('click', () => {
                UI.applyFitMode(radio.value);
                saveSettings({ fitMode: radio.value });
            });
        }
    });

    // Background colour swatches
    ['bgBlack', 'bgGray', 'bgWhite'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            const color = e.currentTarget.dataset.color;
            UI.applyPageBackground(color);
            saveSettings({ pageBg: color });
        });
    });

    // Pre-fetch depth slider
    document.getElementById('prefetchSlider')?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        State.setPrefetchDepth(val);
        const label = document.getElementById('prefetchLabel');
        if (label) label.textContent = val;
        saveSettings({ prefetchDepth: val });
    });

    // HUD bookmark button — toggle bookmark for current page
    document.getElementById('bookmarkButton')?.addEventListener('click', () => {
        const fileKey = State.getCurrentFileKey();
        if (!fileKey) return;
        const { currentImageIndex } = State.getState();
        toggleBookmark(fileKey, currentImageIndex);
        UI.updateBookmarkIndicator(currentImageIndex);
        UI.renderBookmarkList();
    });

    // Options panel — clear all bookmarks for current file
    document.getElementById('clearBookmarksButton')?.addEventListener('click', () => {
        const fileKey = State.getCurrentFileKey();
        if (!fileKey) return;
        clearBookmarks(fileKey);
        UI.updateBookmarkIndicator(State.getState().currentImageIndex);
        UI.renderBookmarkList();
    });

    // Corrupt-page banner dismiss button
    document.getElementById('corruptBannerDismiss')?.addEventListener('click', () => UI.hideCorruptBanner());

    // Swipe left on the options panel to close it
    let panelSwipeStartX = 0;
    DOM.menuPanel?.addEventListener('touchstart', (e) => {
        panelSwipeStartX = e.touches[0].clientX;
    }, { passive: true });
    DOM.menuPanel?.addEventListener('touchend', (e) => {
        // Panel slides from the right; a right-swipe (positive deltaX) closes it
        if (e.changedTouches[0].clientX - panelSwipeStartX > 60) UI.hideMenuPanel();
    }, { passive: true });

    // Library re-open: dispatched by renderRecentFiles Open buttons
    document.addEventListener('comet:reopen', async (e) => {
        const file = await openFileFromHandle(e.detail.fileKey);
        if (file) {
            handleFile(file);
        } else {
            UI.showView('upload');
            UI.showMessage('File permission denied — please select the file again.');
            setTimeout(UI.hideMessage, 3500);
        }
    });

    // SECTION: Input-Specific Listeners (Delegated to other modules)

    // Set up mouse-specific event listeners (e.g., click to navigate, drag to pan).
    // The implementation details are in 'comet-mouse-handler.js'.
    setupMouseListeners();

    // Set up touch-specific event listeners (e.g., tap to navigate, pinch to zoom).
    // The implementation details are in 'comet-touch-handler.js'.
    setupTouchListeners();

    // Add a global keydown listener to handle keyboard shortcuts and navigation.
    // The actual key handling logic is in 'comet-keyboard-handler.js'.
    document.addEventListener('keydown', handleKeyDown);

    // Log to console for debugging or to confirm completion.
    console.log("Event listeners setup complete.");
}
