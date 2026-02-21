// js/comet-settings.js
// Centralised persistence layer. All user preferences are stored as a single
// JSON object under SETTINGS_KEY in localStorage.

const SETTINGS_KEY = 'comet-settings';

export const DEFAULTS = Object.freeze({
    mangaMode: false,
    twoPage: false,
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
 * Reads stored settings and syncs all UI controls + state to match.
 * Call once during app initialisation, after DOM is ready.
 * @param {object} DOM   - the comet-dom module
 * @param {object} State - the comet-state module
 * @param {object} UI    - the comet-ui module
 * @returns {object} the loaded settings
 */
export function applySettings(DOM, State, UI) {
    const s = loadSettings();

    // --- Manga Mode ---
    if (DOM.mangaModeToggle) DOM.mangaModeToggle.checked = s.mangaMode;
    State.setIsMangaModeActive(s.mangaMode);

    // --- Two-Page Spread ---
    if (DOM.twoPageToggle) DOM.twoPageToggle.checked = s.twoPage;
    State.setIsTwoPageSpreadActive(s.twoPage);

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
