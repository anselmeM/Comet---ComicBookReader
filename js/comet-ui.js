// js/comet-ui.js
import * as DOM from './comet-dom.js';
import * as State from './comet-state.js';
// We need to import displayPage directly if applyMangaMode calls it.
// Let's defer that and assume it's handled or reorganize later if needed.
// For now, let's import it from comet-navigation.js
import { displayPage } from './comet-navigation.js';

// --- View Management ---
// ... (showView, showUploadView - unchanged) ...
export function showView(viewName) {
    Object.values(DOM.views).forEach(v => v.classList.remove('active'));
    if (DOM.views[viewName]) {
        DOM.views[viewName].classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}
export function showUploadView() {
    showView('upload');
    State.resetAllState();
    if (DOM.comicImage) { DOM.comicImage.onerror = null; DOM.comicImage.src = ""; }
    updateUI();
    if (DOM.menuPanel) DOM.menuPanel.classList.remove('visible');
    hideMessage();
    document.body.style.overflow = '';
}

// --- Message Handling ---
// ... (showMessage, hideMessage - unchanged) ...
export function showMessage(msg) {
    if (DOM.readerMessage) {
        DOM.readerMessage.querySelector('span').textContent = msg;
        DOM.readerMessage.classList.remove('hidden');
        DOM.readerMessage.classList.add('flex');
    }
}
export function hideMessage() {
    if (DOM.readerMessage) {
        DOM.readerMessage.classList.add('hidden');
        DOM.readerMessage.classList.remove('flex');
    }
}

// --- HUD & Menu ---
// ... (showHUD, hideHUD, toggleHUD, showMenuPanel, hideMenuPanel - unchanged) ...
export function showHUD() {
    if (!DOM.hudOverlay || !DOM.imageContainer) return;
    clearTimeout(State.getState().hudTimer);
    DOM.hudOverlay.classList.add('visible');
    DOM.imageContainer.style.paddingTop = State.HUD_TOP_BAR_HEIGHT;
    State.setHudTimer(setTimeout(hideHUD, 4000));
}
export function hideHUD(delay = 4000) {
    if (!DOM.hudOverlay || !DOM.imageContainer) return;
    clearTimeout(State.getState().hudTimer);
    const action = () => {
        DOM.hudOverlay.classList.remove('visible');
        DOM.imageContainer.style.paddingTop = '0px';
    };
    if (delay === 0) {
        action();
    } else {
        State.setHudTimer(setTimeout(action, delay));
    }
}
export function toggleHUD() { (DOM.hudOverlay && DOM.hudOverlay.classList.contains('visible')) ? hideHUD(0) : showHUD(); }
export function showMenuPanel() { if (DOM.menuPanel) DOM.menuPanel.classList.add('visible'); hideHUD(0); }
export function hideMenuPanel() { if (DOM.menuPanel) DOM.menuPanel.classList.remove('visible'); }


// --- Zoom & Fit ---
export function isZoomed() {
    if (!DOM.comicImage || !DOM.imageContainer) return false;
    // Check if image dimensions exceed container dimensions (add a small tolerance)
    return DOM.comicImage.clientWidth > DOM.imageContainer.clientWidth + 1 ||
           DOM.comicImage.clientHeight > DOM.imageContainer.clientHeight + 1;
}

/**
 * Centers the image within the container if it's zoomed in.
 */
function centerImageIfZoomed() {
    if (isZoomed() && DOM.comicImage && DOM.imageContainer) {
        const imageWidth = DOM.comicImage.clientWidth;
        const imageHeight = DOM.comicImage.clientHeight;
        const containerWidth = DOM.imageContainer.clientWidth;
        const containerHeight = DOM.imageContainer.clientHeight;

        // Calculate how much the image overflows the container
        const overflowX = imageWidth - containerWidth;
        const overflowY = imageHeight - containerHeight;

        // Set scrollLeft/Top to half the overflow (if positive) to center it
        DOM.imageContainer.scrollLeft = overflowX > 0 ? overflowX / 2 : 0;
        DOM.imageContainer.scrollTop = overflowY > 0 ? overflowY / 2 : 0;
        console.log(`Centering: scrollLeft=${DOM.imageContainer.scrollLeft}, scrollTop=${DOM.imageContainer.scrollTop}`);
    } else if (DOM.imageContainer) {
         // If not zoomed, ensure scroll is reset
         DOM.imageContainer.scrollLeft = 0;
         DOM.imageContainer.scrollTop = 0;
    }
}

/**
 * Updates the container's overflow and cursor based on zoom state.
 * Also calls centerImageIfZoomed.
 */
function updateZoomStateUI(center = false) {
    setTimeout(() => {
        if (isZoomed()) {
            DOM.imageContainer.style.overflow = 'auto'; // Allow scrolling
            DOM.imageContainer.style.cursor = 'grab';   // Indicate grabbable
        } else {
            DOM.imageContainer.style.overflow = 'hidden';// Hide scrollbars
            DOM.imageContainer.style.cursor = 'pointer'; // Indicate clickable
        }
        if (center) {
            centerImageIfZoomed();
        }
    }, 50); // Delay allows browser to render new size before calculating/scrolling
}

// ---> REVISED: applyFitMode <---
export function applyFitMode(modeValue) {
    if (!DOM.comicImage || !DOM.imageContainer) return;
    State.setFitMode(modeValue);
    DOM.comicImage.style.width = 'auto'; DOM.comicImage.style.height = 'auto';
    DOM.comicImage.style.maxWidth = 'none'; DOM.comicImage.style.maxHeight = 'none';
    // Reset scroll before applying mode
    DOM.imageContainer.scrollLeft = 0; DOM.imageContainer.scrollTop = 0;

    if (!DOM.comicImage.naturalWidth || DOM.comicImage.naturalWidth === 0) {
        if (!DOM.comicImage.complete && DOM.comicImage.src && !DOM.comicImage.src.startsWith("file:")) {
            DOM.comicImage.addEventListener('load', () => applyFitMode(modeValue), { once: true });
        } return;
    }
    switch (State.getState().fitMode) {
        case 'best': DOM.comicImage.style.maxWidth = '100%'; DOM.comicImage.style.maxHeight = '100%'; break;
        case 'width': DOM.comicImage.style.width = '100%'; DOM.comicImage.style.height = 'auto'; break;
        case 'height': DOM.comicImage.style.height = `${DOM.imageContainer.clientHeight}px`; DOM.comicImage.style.width = 'auto'; break;
        case 'original': DOM.comicImage.style.width = `${DOM.comicImage.naturalWidth}px`; DOM.comicImage.style.height = `${DOM.comicImage.naturalHeight}px`; break;
    }

    // Update UI and center the image (important for 'original')
    updateZoomStateUI(true); // <-- Pass true to center

    if (DOM.fitLabels) DOM.fitLabels.forEach(label => {
        const radio = label.querySelector('input');
        if (radio) { label.classList.toggle('checked', radio.value === State.getState().fitMode); radio.checked = radio.value === State.getState().fitMode; }
    });
}

// ---> REVISED: changeZoom <---
export function changeZoom(factor) {
    if (!DOM.comicImage) return;
    const currentWidth = DOM.comicImage.clientWidth;
    DOM.comicImage.style.width = `${currentWidth * factor}px`;
    DOM.comicImage.style.height = 'auto';
    DOM.comicImage.style.maxWidth = 'none'; DOM.comicImage.style.maxHeight = 'none';
    State.setFitMode('manual');

    // Update UI and center the image
    updateZoomStateUI(true); // <-- Pass true to center

    if (DOM.fitLabels) DOM.fitLabels.forEach(label => {
        label.classList.remove('checked');
        const radio = label.querySelector('input'); if (radio) radio.checked = false;
    });
}

// --- Manga Mode & UI Update ---
// ... (applyMangaMode, updateUI - unchanged) ...
export function applyMangaMode() {
    if (!DOM.mangaModeToggle || !State.getState().imageBlobs.length) return;
    State.setIsMangaModeActive(DOM.mangaModeToggle.checked);
    const currentName = State.getState().imageBlobs[State.getState().currentImageIndex]?.name;
    State.setImageBlobs([...State.getState().originalImageBlobs]);
    if (State.getState().isMangaModeActive) State.reverseImageBlobs();
    let newIdx = 0;
    if (currentName) {
        newIdx = State.getState().imageBlobs.findIndex(img => img.name === currentName);
        if (newIdx === -1) newIdx = 0;
    }
    State.setCurrentImageIndex(-1);
    displayPage(newIdx); // Call displayPage from navigation
}
export function updateUI() {
    if (DOM.pageIndicatorHud) {
        const { currentImageIndex, imageBlobs } = State.getState();
        DOM.pageIndicatorHud.textContent = imageBlobs.length > 0 ? `${currentImageIndex + 1} / ${imageBlobs.length}` : `0 / 0`;
    }
}