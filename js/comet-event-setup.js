// js/comet-event-setup.js
import * as DOM from './comet-dom.js';
import * as UI from './comet-ui.js';
import * as State from './comet-state.js';
import { handleFile } from './comet-file-handler.js';
import { handleKeyDown } from './comet-keyboard-handler.js';
import { setupMouseListeners } from './comet-mouse-handler.js';
import { setupTouchListeners } from './comet-touch-handler.js';

/**
 * Sets up all application event listeners by delegating to specific modules.
 */
export function setupEventListeners() {
    console.log("Setting up all event listeners...");

    // File Input / Drop Zone
    DOM.selectFileButton?.addEventListener('click', () => DOM.fileInput.click());
    DOM.uploadButtonHeader?.addEventListener('click', () => DOM.fileInput.click());
    DOM.uploadButtonHeaderMobile?.addEventListener('click', () => {
         // Close mobile menu if open before clicking input
        const mobMenu = document.getElementById('mobileMenu');
        const hamButton = document.getElementById('hamburgerButton');
        if (mobMenu && mobMenu.classList.contains('open') && hamButton) {
            mobMenu.classList.remove('open');
            hamButton.setAttribute('aria-expanded', 'false');
            hamButton.innerHTML = `<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>`;
        }
        DOM.fileInput.click();
    });
    DOM.fileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) { handleFile(e.target.files[0]); e.target.value = ''; }
    });
    DOM.dropZone?.addEventListener('dragover', (e) => { e.preventDefault(); DOM.dropZone.classList.add('dragging'); });
    DOM.dropZone?.addEventListener('dragleave', (e) => { e.preventDefault(); DOM.dropZone.classList.remove('dragging'); });
    DOM.dropZone?.addEventListener('drop', (e) => { e.preventDefault(); DOM.dropZone.classList.remove('dragging'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });

    // HUD & Menu
    DOM.hudOverlay?.addEventListener('click', (e) => { if (DOM.hudOverlay.classList.contains('visible') && e.target === DOM.hudOverlay) { UI.hideHUD(0); e.stopPropagation(); } });
    DOM.backButton?.addEventListener('click', UI.showUploadView);
    DOM.menuButton?.addEventListener('click', UI.showMenuPanel);
    DOM.closeMenuButton?.addEventListener('click', UI.hideMenuPanel);
    DOM.mangaModeToggle?.addEventListener('change', UI.applyMangaMode);
    DOM.zoomInButtonPanel?.addEventListener('click', () => UI.changeZoom(State.ZOOM_STEP));
    DOM.zoomOutButtonPanel?.addEventListener('click', () => UI.changeZoom(1 / State.ZOOM_STEP));
    DOM.fitLabels?.forEach(label => { const radio = label.querySelector('input'); if (radio) label.addEventListener('click', () => UI.applyFitMode(radio.value)); });

    // Input-Specific Listeners
    setupMouseListeners();
    setupTouchListeners();
    document.addEventListener('keydown', handleKeyDown);

    console.log("Event listeners setup complete.");
}