// js/comet-settings.js
// Centralised persistence layer. All user preferences are stored as a single
// JSON object under SETTINGS_KEY in localStorage.

const SETTINGS_KEY = 'comet-settings';

export const DEFAULTS = Object.freeze({
    mangaMode: false,
    twoPage: false,
    smartCover: false,
    smartSplit: false,
    verticalScroll: false,
    fitMode: 'best',
    pageBg: 'black',
    prefetchDepth: 2,
});

/**
 * Reads settings from localStorage, merging with defaults so newly-added
 * keys are always present even for returning users.
 * @returns {object}
 */
export function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch {
        return { ...DEFAULTS };
    }
}

/**
 * Merges `patch` into the current stored settings and persists.
 * @param {object} patch
 */
export function saveSettings(patch) {
    try {
        const current = loadSettings();
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...patch }));
    } catch {
        // localStorage unavailable (e.g. private browsing with restrictions)
    }
}

/**
 * Loads specific overrides for a single file, based on its unique key.
 * @param {string} fileKey 
 * @returns {object|null}
 */
export function loadFileSettings(fileKey) {
    if (!fileKey) return null;
    try {
        const raw = localStorage.getItem(`${SETTINGS_KEY}-${fileKey}`);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null; // LocalStorage unavailable
    }
}

/**
 * Saves specific overrides for a single file.
 * @param {string} fileKey 
 * @param {object} patch 
 */
export function saveFileSettings(fileKey, patch) {
    if (!fileKey) return;
    try {
        const current = loadFileSettings(fileKey) || {};
        localStorage.setItem(`${SETTINGS_KEY}-${fileKey}`, JSON.stringify({ ...current, ...patch }));
    } catch {
        // LocalStorage unavailable
    }
}

/**
 * Reads stored settings and syncs all UI controls + state to match.
 * Call once during app initialisation, after DOM is ready.
 * @param {object} DOM   - the comet-dom module
 * @param {object} State - the comet-state module
 * @param {object} UI    - the comet-ui module
 * @param {object} fileOverrides - optional file-specific settings to merge
 * @returns {object} the loaded settings
 */
export function applySettings(DOM, State, UI, fileOverrides = null) {
    let s = loadSettings();
    if (fileOverrides) {
        s = { ...s, ...fileOverrides };
    }

    // --- Manga Mode ---
    if (DOM.mangaModeToggle) DOM.mangaModeToggle.checked = s.mangaMode;
    State.setIsMangaModeActive(s.mangaMode);

    // --- Two-Page Spread ---
    if (DOM.twoPageToggle) DOM.twoPageToggle.checked = s.twoPage;
    State.setIsTwoPageSpreadActive(s.twoPage);

    // --- Smart Cover ---
    const smartCoverToggle = document.getElementById('smartCoverToggle');
    if (smartCoverToggle) {
        smartCoverToggle.checked = s.smartCover;
        smartCoverToggle.disabled = !s.twoPage; // only relevant when two-page is on
    }
    State.setIsSmartCoverActive(s.smartCover);

    // --- Smart Split ---
    const smartSplitToggle = document.getElementById('smartSplitToggle');
    if (smartSplitToggle) smartSplitToggle.checked = s.smartSplit;
    State.setIsSmartSplitActive(s.smartSplit);

    // --- Vertical Scroll ---
    const verticalScrollToggle = document.getElementById('verticalScrollToggle');
    if (verticalScrollToggle) verticalScrollToggle.checked = s.verticalScroll;
    State.setIsVerticalScrollActive(s.verticalScroll);
    if (s.verticalScroll && UI.toggleVerticalScroll) {
        UI.toggleVerticalScroll(s.verticalScroll);
    }

    // --- Fit Mode ---
    // Pre-select the correct radio without triggering a full re-render
    // (no comic is loaded yet at init time, so applyFitMode is safe to call)
    UI.applyFitMode(s.fitMode);

    // --- Page Background ---
    UI.applyPageBackground(s.pageBg);

    // --- Pre-fetch Depth ---
    State.setPrefetchDepth(s.prefetchDepth);
    const slider = document.getElementById('prefetchSlider');
    const label = document.getElementById('prefetchLabel');
    if (slider) slider.value = s.prefetchDepth;
    if (label) label.textContent = s.prefetchDepth;

    return s;
}
