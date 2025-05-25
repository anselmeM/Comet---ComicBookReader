// js/comet-reader.js
import * as DOM from './comet-dom.js';
import * as UI from './comet-ui.js';
import * as Interactions from './comet-interactions.js';
import * as State from './comet-state.js'; // Might need for init state

document.addEventListener('DOMContentLoaded', () => {
    console.log("Comet Reader Logic: Initializing...");

    // Check if we have the core elements to run
    if (!DOM.checkCriticalElements()) {
         console.log("Not on index.html or core elements missing, skipping reader initialization.");
         document.body.style.overflow = '';
         return; // Stop execution if core elements aren't found
    }

    // Setup all event listeners
    Interactions.setupEventListeners();

    // Set initial state / view
    UI.showView('upload');
    if (DOM.mangaModeToggle) {
        State.setIsMangaModeActive(DOM.mangaModeToggle.checked);
    }
    UI.applyFitMode('best');
    DOM.imageContainer.style.overflow = 'hidden';
    DOM.imageContainer.style.cursor = 'pointer';

    console.log("Comet Reader: Initialization COMPLETE.");
});