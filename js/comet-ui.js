// js/comet-ui.js
import * as DOM from './comet-dom.js';
import * as State from './comet-state.js';
import { displayPage } from './comet-navigation.js'; // Needs displayPage for applyMangaMode

// --- View Management ---
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
    if (State.getState().currentObjectUrl) { URL.revokeObjectURL(State.getState().currentObjectUrl); State.setCurrentObjectUrl(null); }
    if (State.getState().previousObjectUrl) { URL.revokeObjectURL(State.getState().previousObjectUrl); State.setPreviousObjectUrl(null); }
    if (DOM.comicImage) { DOM.comicImage.onerror = null; DOM.comicImage.src = ""; }
    updateUI();
    if (DOM.menuPanel) DOM.menuPanel.classList.remove('visible');
    hideMessage();
    document.body.style.overflow = '';
}

// --- Message Handling ---
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
    return DOM.comicImage.clientWidth > DOM.imageContainer.clientWidth ||
           DOM.comicImage.clientHeight > DOM.imageContainer.clientHeight;
}

export function applyFitMode(modeValue) {
    if (!DOM.comicImage || !DOM.imageContainer) return;
    State.setFitMode(modeValue);
    DOM.comicImage.style.width = 'auto'; DOM.comicImage.style.height = 'auto';
    DOM.comicImage.style.maxWidth = 'none'; DOM.comicImage.style.maxHeight = 'none';
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
    updateCursorAndOverflow();
    if (DOM.fitLabels) DOM.fitLabels.forEach(label => {
        const radio = label.querySelector('input');
        if (radio) { label.classList.toggle('checked', radio.value === State.getState().fitMode); radio.checked = radio.value === State.getState().fitMode; }
    });
}

export function changeZoom(factor) {
    if (!DOM.comicImage) return;
    const currentWidth = DOM.comicImage.clientWidth;
    DOM.comicImage.style.width = `${currentWidth * factor}px`;
    DOM.comicImage.style.height = 'auto';
    DOM.comicImage.style.maxWidth = 'none'; DOM.comicImage.style.maxHeight = 'none';
    State.setFitMode('manual');
    updateCursorAndOverflow();
    if (DOM.fitLabels) DOM.fitLabels.forEach(label => {
        label.classList.remove('checked');
        const radio = label.querySelector('input'); if (radio) radio.checked = false;
    });
}

export function updateCursorAndOverflow() {
    setTimeout(() => {
        if (isZoomed()) {
            DOM.imageContainer.style.overflow = 'auto';
            DOM.imageContainer.style.cursor = 'grab';
        } else {
            DOM.imageContainer.style.overflow = 'hidden';
            DOM.imageContainer.style.cursor = 'pointer';
        }
    }, 50);
}

// --- Manga Mode & UI Update ---
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