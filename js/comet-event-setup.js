// js/comet-event-setup.js

// Import necessary DOM elements, UI functions, state variables, and specific event handlers.
// This modular approach keeps the codebase organized.
import * as DOM from './comet-dom.js'; // For accessing DOM elements
import * as UI from './comet-ui.js';   // For UI manipulation functions (showing/hiding elements, applying modes)
import * as State from './comet-state.js'; // For application state (like zoom step)
import * as Auth from './comet-auth.js'; // For authentication
import { handleFile } from './comet-file-handler.js'; // For processing selected/dropped files
import { handleKeyDown } from './comet-keyboard-handler.js'; // For keyboard navigation/actions
import { setupMouseListeners } from './comet-mouse-handler.js'; // For mouse-specific interactions (like panning, clicking for next/prev page)
import { setupTouchListeners } from './comet-touch-handler.js'; // For touch-specific interactions

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

    // SECTION: Authentication & Navigation Event Listeners

    // "Get Started" button -> Show Login View
    DOM.getStartedButton?.addEventListener('click', () => {
        UI.showView('login');
    });

    // Login Form Submission
    DOM.loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = DOM.loginEmailInput?.value;
        const password = DOM.loginPasswordInput?.value;

        // Simple UI feedback
        const btn = DOM.loginButton;
        if(btn) { btn.textContent = "Signing in..."; btn.disabled = true; }

        const success = await Auth.login(email, password);

        if(btn) { btn.textContent = "Sign in"; btn.disabled = false; }

        if (success) {
            UI.showUploadView();
        } else {
            alert("Login failed. Please enter any email and password.");
        }
    });

    // Logout Button
    DOM.logoutButton?.addEventListener('click', () => {
        Auth.logout();
        UI.showView('landing');
    });

    // When the 'Select File' button is clicked, programmatically click the hidden file input.
    // This allows for custom styling of the file selection trigger.
    DOM.selectFileButton?.addEventListener('click', () => DOM.fileInput.click());

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
    DOM.dropZone?.addEventListener('drop', (e) => {
        e.preventDefault(); // Prevent default browser behavior.
        DOM.dropZone.classList.remove('dragging'); // Remove the visual feedback class.
        // Check if files were included in the drop data.
        if (e.dataTransfer.files.length > 0) {
            // Pass the first dropped file to the file handler.
            handleFile(e.dataTransfer.files[0]);
        }
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
    DOM.mangaModeToggle?.addEventListener('change', UI.applyMangaMode);

    // When the 'Zoom In' button in the panel is clicked:
    // Call the changeZoom function from the UI module with a positive zoom step.
    DOM.zoomInButtonPanel?.addEventListener('click', () => UI.changeZoom(State.ZOOM_STEP));

    // When the 'Zoom Out' button in the panel is clicked:
    // Call the changeZoom function with a reciprocal of the zoom step (to zoom out).
    DOM.zoomOutButtonPanel?.addEventListener('click', () => UI.changeZoom(1 / State.ZOOM_STEP));

    // For each 'fit-label' element (likely radio button labels for fit modes):
    DOM.fitLabels?.forEach(label => {
        // Find the actual radio input element within the label.
        const radio = label.querySelector('input[type="radio"]');
        if (radio) {
            // Add a click listener to the label (improves usability, as clicking label checks radio).
            // When clicked, apply the fit mode corresponding to the radio button's value.
            label.addEventListener('click', () => UI.applyFitMode(radio.value));
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
