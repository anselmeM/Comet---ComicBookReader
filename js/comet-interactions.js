// js/comet-interactions.js
import * as DOM from './comet-dom.js';
import * as State from './comet-state.js';
import * as UI from './comet-ui.js';
import * as Nav from './comet-navigation.js';
import { handleFile } from './comet-file-handler.js';

// --- Pan Handlers ---
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

// --- Touch Handlers (Swipe & Pan) ---
function handleTouchStart(event) {
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        if (!handlePanStart(touch.clientX, touch.clientY)) {
            State.setTouchStart(touch.clientX, touch.clientY);
            State.setIsPotentialSwipe(true);
        } else {
            State.setIsPotentialSwipe(false);
        }
    }
}

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
                event.preventDefault();
            }
        }
    }
}

function handleTouchEnd(event) {
    if (handlePanEnd()) {
        // Pan ended, maybe prevent click if didDrag is true
    } else if (State.getState().isPotentialSwipe) {
        const { touchStartX, touchEndX, touchStartY, touchEndY, isMangaModeActive } = State.getState();
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        if (Math.abs(deltaX) > State.SWIPE_THRESHOLD && Math.abs(deltaY) < State.VERTICAL_THRESHOLD) {
            if (deltaX < 0) { isMangaModeActive ? Nav.prevPage() : Nav.nextPage(); }
            else { isMangaModeActive ? Nav.nextPage() : Nav.prevPage(); }
            State.setDidDrag(true); // Prevent click after swipe
        }
        State.resetSwipeState();
    }
}

// --- Click Handler ---
function handleImageContainerClick(event) {
    if (State.getState().didDrag) {
        State.setDidDrag(false); return;
    }
    if (DOM.menuPanel && DOM.menuPanel.classList.contains('visible')) return;
    const scrollbarWidth = 17;
    if (event.offsetX >= DOM.imageContainer.clientWidth - scrollbarWidth || event.offsetY >= DOM.imageContainer.clientHeight - scrollbarWidth) return;
    if (DOM.hudOverlay && DOM.hudOverlay.classList.contains('visible') && event.target.closest('.hud-icon')) {
        UI.showHUD(); return;
    }
    if (UI.isZoomed()) { UI.toggleHUD(); return; }

    const rect = DOM.imageContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const containerWidth = DOM.imageContainer.clientWidth;
    const isManga = State.getState().isMangaModeActive;

    if (x < containerWidth * 0.25) { isManga ? Nav.nextPage() : Nav.prevPage(); }
    else if (x > containerWidth * 0.75) { isManga ? Nav.prevPage() : Nav.nextPage(); }
    else { UI.toggleHUD(); }
}

// --- Keydown Handler ---
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
    // File Input / Drop Zone
    DOM.selectFileButton?.addEventListener('click', () => DOM.fileInput.click());
    DOM.uploadButtonHeader?.addEventListener('click', () => DOM.fileInput.click());
    DOM.uploadButtonHeaderMobile?.addEventListener('click', () => DOM.fileInput.click());
    DOM.fileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) { handleFile(e.target.files[0]); e.target.value = ''; }
    });
    DOM.dropZone?.addEventListener('dragover', (e) => { e.preventDefault(); DOM.dropZone.classList.add('dragging'); });
    DOM.dropZone?.addEventListener('dragleave', (e) => { e.preventDefault(); DOM.dropZone.classList.remove('dragging'); });
    DOM.dropZone?.addEventListener('drop', (e) => { e.preventDefault(); DOM.dropZone.classList.remove('dragging'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });

    // Image Container (Click, Touch, Mouse Pan)
    DOM.imageContainer?.addEventListener('click', handleImageContainerClick);
    DOM.imageContainer?.addEventListener('touchstart', handleTouchStart, { passive: false });
    DOM.imageContainer?.addEventListener('touchmove', handleTouchMove, { passive: false });
    DOM.imageContainer?.addEventListener('touchend', handleTouchEnd);
    DOM.imageContainer?.addEventListener('touchcancel', handleTouchEnd);
    DOM.imageContainer?.addEventListener('mousedown', (e) => { if (e.button === 0 && handlePanStart(e.clientX, e.clientY)) e.preventDefault(); });
    document.addEventListener('mousemove', (e) => { if (handlePanMove(e.clientX, e.clientY)) e.preventDefault(); });
    document.addEventListener('mouseup', handlePanEnd);
    document.addEventListener('mouseleave', handlePanEnd); // Handle mouse leaving window

    // HUD & Menu
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