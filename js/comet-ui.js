// js/comet-ui.js
import * as DOM from './comet-dom.js';
import * as State from './comet-state.js';
import { displayPage } from './comet-navigation.js';

// ... (showView, showUploadView, showMessage, hideMessage, HUD functions - unchanged) ...
export function showView(viewName) { /* ... */ }
export function showUploadView() { /* ... */ }
export function showMessage(msg) { /* ... */ }
export function hideMessage() { /* ... */ }
export function showHUD() { /* ... */ }
export function hideHUD(delay = 4000) { /* ... */ }
export function toggleHUD() { /* ... */ }
export function showMenuPanel() { /* ... */ }
export function hideMenuPanel() { /* ... */ }

// --- Zoom & Fit ---
export function isZoomed() {
    if (!DOM.comicImage || !DOM.imageContainer) return false;
    return DOM.comicImage.clientWidth > DOM.imageContainer.clientWidth + 1 ||
           DOM.comicImage.clientHeight > DOM.imageContainer.clientHeight + 1;
}

function centerImageIfZoomed() {
    if (isZoomed() && DOM.comicImage && DOM.imageContainer) {
        const imageWidth = DOM.comicImage.clientWidth;
        const imageHeight = DOM.comicImage.clientHeight;
        const containerWidth = DOM.imageContainer.clientWidth;
        const containerHeight = DOM.imageContainer.clientHeight;
        const overflowX = imageWidth - containerWidth;
        const overflowY = imageHeight - containerHeight;
        DOM.imageContainer.scrollLeft = overflowX > 0 ? overflowX / 2 : 0;
        DOM.imageContainer.scrollTop = overflowY > 0 ? overflowY / 2 : 0;
        console.log(`Centering: scrollLeft=${DOM.imageContainer.scrollLeft}, scrollTop=${DOM.imageContainer.scrollTop}`);
    } else if (DOM.imageContainer) {
         DOM.imageContainer.scrollLeft = 0;
         DOM.imageContainer.scrollTop = 0;
    }
}

// ---> REVISED: updateZoomStateUI <---
function updateZoomStateUI(center = false) {
    setTimeout(() => {
        if (isZoomed()) {
            DOM.imageContainer.style.overflow = 'auto';
            DOM.imageContainer.style.cursor = 'grab';
            DOM.imageContainer.style.touchAction = 'none'; // <-- Tell browser WE handle touch
        } else {
            DOM.imageContainer.style.overflow = 'hidden';
            DOM.imageContainer.style.cursor = 'pointer';
            DOM.imageContainer.style.touchAction = 'auto'; // <-- Restore default browser handling
        }
        if (center) {
            centerImageIfZoomed();
        }
    }, 50);
}

// ... (applyFitMode, changeZoom, applyMangaMode, updateUI - unchanged) ...
export function applyFitMode(modeValue) { /* ... */ }
export function changeZoom(factor) { /* ... */ }
export function applyMangaMode() { /* ... */ }
export function updateUI() { /* ... */ }