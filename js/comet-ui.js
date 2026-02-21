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
    if (DOM.comicImage2) { DOM.comicImage2.onerror = null; DOM.comicImage2.src = ""; DOM.comicImage2.classList.add('hidden'); }
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
    if (!DOM.imageContainer) return false;
    // Check if scroll dimensions exceed client dimensions (add a small tolerance)
    return DOM.imageContainer.scrollWidth > DOM.imageContainer.clientWidth + 1 ||
           DOM.imageContainer.scrollHeight > DOM.imageContainer.clientHeight + 1;
}

/**
 * Centers the image within the container if it's zoomed in.
 */
function centerImageIfZoomed() {
    if (isZoomed() && DOM.imageContainer) {
        const scrollWidth = DOM.imageContainer.scrollWidth;
        const scrollHeight = DOM.imageContainer.scrollHeight;
        const clientWidth = DOM.imageContainer.clientWidth;
        const clientHeight = DOM.imageContainer.clientHeight;

        // Calculate how much the content overflows the container
        const overflowX = scrollWidth - clientWidth;
        const overflowY = scrollHeight - clientHeight;

        // Set scrollLeft/Top to half the overflow (if positive) to center it
        // Note: this centers initially.
        DOM.imageContainer.scrollLeft = overflowX > 0 ? overflowX / 2 : 0;
        DOM.imageContainer.scrollTop = overflowY > 0 ? overflowY / 2 : 0;
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

    const isTwoPage = State.getState().isTwoPageSpreadActive;
    const imgs = isTwoPage ? [DOM.comicImage, DOM.comicImage2] : [DOM.comicImage];

    // Reset styles
    imgs.forEach(img => {
        if (!img) return;
        img.style.width = 'auto'; img.style.height = 'auto';
        img.style.maxWidth = 'none'; img.style.maxHeight = 'none';
        img.style.flex = ''; // Reset flex
    });

    // Reset scroll before applying mode
    DOM.imageContainer.scrollLeft = 0; DOM.imageContainer.scrollTop = 0;

    // Wait for load if not complete (simple check on first image)
    if (!DOM.comicImage.naturalWidth || DOM.comicImage.naturalWidth === 0) {
        if (!DOM.comicImage.complete && DOM.comicImage.src && !DOM.comicImage.src.startsWith("file:")) {
            DOM.comicImage.addEventListener('load', () => applyFitMode(modeValue), { once: true });
        }
        // If two page, we might want to wait for second too, but usually they load close together or we call applyFitMode again on load.
        return;
    }

    const mode = State.getState().fitMode;

    if (isTwoPage) {
        DOM.comicImage2.classList.remove('hidden');
        switch (mode) {
            case 'best':
                imgs.forEach(img => { img.style.maxWidth = '50%'; img.style.maxHeight = '100%'; });
                break;
            case 'width':
                imgs.forEach(img => { img.style.width = '50%'; img.style.height = 'auto'; });
                break;
            case 'height':
                imgs.forEach(img => { img.style.height = `${DOM.imageContainer.clientHeight}px`; img.style.width = 'auto'; });
                break;
            case 'original':
                imgs.forEach(img => { img.style.width = `${img.naturalWidth}px`; img.style.height = `${img.naturalHeight}px`; });
                break;
        }
    } else {
        DOM.comicImage2.classList.add('hidden');
        switch (mode) {
            case 'best': DOM.comicImage.style.maxWidth = '100%'; DOM.comicImage.style.maxHeight = '100%'; break;
            case 'width': DOM.comicImage.style.width = '100%'; DOM.comicImage.style.height = 'auto'; break;
            case 'height': DOM.comicImage.style.height = `${DOM.imageContainer.clientHeight}px`; DOM.comicImage.style.width = 'auto'; break;
            case 'original': DOM.comicImage.style.width = `${DOM.comicImage.naturalWidth}px`; DOM.comicImage.style.height = `${DOM.comicImage.naturalHeight}px`; break;
        }
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

    const isTwoPage = State.getState().isTwoPageSpreadActive;
    const imgs = isTwoPage ? [DOM.comicImage, DOM.comicImage2] : [DOM.comicImage];

    imgs.forEach(img => {
        if (!img) return;
        const currentWidth = img.clientWidth;
        img.style.width = `${currentWidth * factor}px`;
        img.style.height = 'auto';
        img.style.maxWidth = 'none'; img.style.maxHeight = 'none';
    });

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

export function toggleTwoPageMode() {
    if (!DOM.twoPageToggle) return;
    State.setIsTwoPageSpreadActive(DOM.twoPageToggle.checked);
    displayPage(State.getState().currentImageIndex);
}

export function updateUI() {
    if (DOM.pageIndicatorHud) {
        const { currentImageIndex, imageBlobs, isTwoPageSpreadActive } = State.getState();
        const total = imageBlobs.length;
        if (total === 0) {
            DOM.pageIndicatorHud.textContent = `0 / 0`;
        } else if (isTwoPageSpreadActive && currentImageIndex + 1 < total) {
             DOM.pageIndicatorHud.textContent = `${currentImageIndex + 1}-${currentImageIndex + 2} / ${total}`;
        } else {
             DOM.pageIndicatorHud.textContent = `${currentImageIndex + 1} / ${total}`;
        }
    }
}
