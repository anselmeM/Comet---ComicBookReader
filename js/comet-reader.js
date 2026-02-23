// js/comet-reader.js
import * as DOM from './comet-dom.js';
import * as UI from './comet-ui.js';
import * as State from './comet-state.js';
import { setupEventListeners } from './comet-event-setup.js';
import { applySettings } from './comet-settings.js';

document.addEventListener('DOMContentLoaded', () => {
    // Check if we have the core elements to run
    if (!DOM.checkCriticalElements()) {
        console.log("Not on index.html or core elements missing, skipping reader initialization.");
        document.body.style.overflow = '';
        return; // Stop execution if core elements aren't found
    }

    // Setup all event listeners
    setupEventListeners();

    // Restore saved user preferences (must come after listeners so controls are ready)
    applySettings(DOM, State, UI);

    // Set initial state / view
    UI.showView('upload');
    if (DOM.mangaModeToggle) {
        State.setIsMangaModeActive(DOM.mangaModeToggle.checked);
    }
    DOM.imageContainer.style.overflow = 'hidden';
    DOM.imageContainer.style.cursor = 'pointer';
});
