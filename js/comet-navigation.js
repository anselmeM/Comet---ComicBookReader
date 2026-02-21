// js/comet-navigation.js
import * as DOM from './comet-dom.js';
import * as State from './comet-state.js';
import * as UI from './comet-ui.js';
import { saveProgress } from './comet-progress.js';

/**
 * Lazily loads the blob for the image at the given index.
 * If the entry's blob fails to load, marks it as corrupt and returns null.
 * @param {number} index
 * @returns {Promise<Object|null>}
 */
async function loadImageBlob(index) {
    const { imageBlobs } = State.getState();
    if (index < 0 || index >= imageBlobs.length) return null;

    const imageEntry = imageBlobs[index];

    // Already loaded or already known corrupt
    if (!imageEntry) return null;
    if (imageEntry.corrupt) return null;
    if (imageEntry.blob) return imageEntry;

    if (imageEntry.fileData) {
        try {
            imageEntry.blob = await imageEntry.fileData.async("blob");
        } catch (e) {
            console.error("Failed to lazy load image at index " + index, e);
            imageEntry.corrupt = true;
            State.incrementCorruptPageCount(); // track for post-load banner
            return null;
        }
    }
    return imageEntry;
}

/**
 * Pre-fetches blobs for adjacent pages in the background so they are
 * ready in memory when the user navigates to them.
 * @param {number} currentIndex - The page just displayed.
 */
function prefetchAdjacentPages(currentIndex) {
    const { imageBlobs } = State.getState();
    const depth = State.getPrefetchDepth();
    const indicesToPrefetch = [currentIndex - 1]; // always pre-fetch 1 back
    for (let i = 1; i <= depth; i++) indicesToPrefetch.push(currentIndex + i);
    for (const idx of indicesToPrefetch) {
        if (idx >= 0 && idx < imageBlobs.length) {
            const entry = imageBlobs[idx];
            // Only prefetch if not already loaded and not corrupt
            if (entry && !entry.blob && !entry.corrupt) {
                loadImageBlob(idx); // fire-and-forget
            }
        }
    }
}

export async function displayPage(index) {
    let { imageBlobs, currentImageIndex, isTwoPageSpreadActive } = State.getState();
    if (!imageBlobs || imageBlobs.length === 0 || !DOM.comicImage || !DOM.imageContainer) {
        UI.showMessage("No images to display or essential elements missing."); return;
    }

    // Clamp index
    if (index < 0) index = 0;
    if (index >= imageBlobs.length) index = imageBlobs.length - 1;

    State.setCurrentImageIndex(index);
    UI.updateUI();
    UI.hideHUD(0);

    // --- Load Primary Image ---
    const imageEntry1 = await loadImageBlob(index);

    // Check if the user navigated away while the image was loading
    if (State.getState().currentImageIndex !== index) {
        return;
    }

    // --- Handle corrupted primary entry: skip and advance ---
    if (!imageEntry1 || !imageEntry1.blob) {
        UI.showMessage(`Skipping corrupted page ${index + 1}, trying next…`);
        setTimeout(UI.hideMessage, State.BOUNDARY_MESSAGE_TIMEOUT);
        if (DOM.comicImage) DOM.comicImage.src = "";

        // Try to advance past the corrupt page
        const nextIndex = index + 1;
        if (nextIndex < imageBlobs.length) {
            setTimeout(() => displayPage(nextIndex), State.BOUNDARY_MESSAGE_TIMEOUT);
        }
        return;
    }

    let url1 = State.getCachedObjectUrl(imageEntry1);
    if (!url1) {
        url1 = URL.createObjectURL(imageEntry1.blob);
        State.addObjectUrl(imageEntry1, url1);
    }

    // --- Load Secondary Image (if Two Page Mode) ---
    let url2 = null;
    if (isTwoPageSpreadActive && index + 1 < imageBlobs.length) {
        const imageEntry2 = await loadImageBlob(index + 1);
        if (State.getState().currentImageIndex !== index) return; // Check navigation again

        if (imageEntry2 && imageEntry2.blob) {
            url2 = State.getCachedObjectUrl(imageEntry2);
            if (!url2) {
                url2 = URL.createObjectURL(imageEntry2.blob);
                State.addObjectUrl(imageEntry2, url2);
            }
        }
    }

    // --- Render ---
    DOM.imageContainer.scrollLeft = 0;
    DOM.imageContainer.scrollTop = 0;

    DOM.comicImage.style.opacity = 0;
    DOM.comicImage.src = url1;

    // Handle second image
    if (DOM.comicImage2) {
        if (url2) {
            DOM.comicImage2.style.opacity = 0;
            DOM.comicImage2.src = url2;
            DOM.comicImage2.classList.remove('hidden');
        } else {
            DOM.comicImage2.src = "";
            DOM.comicImage2.classList.add('hidden');
        }
    }

    // Wait for load(s) to apply fit
    DOM.comicImage.onload = () => {
        UI.hideSkeleton(); // Remove shimmer overlay once first image renders
        if (DOM.comicImage) {
            DOM.comicImage.style.opacity = 1;
            if (DOM.comicImage2 && url2) DOM.comicImage2.style.opacity = 1;
            UI.applyFitMode(State.getState().fitMode);
        }
        UI.hideMessage();

        // Save reading progress
        const { imageBlobs } = State.getState();
        const fileKey = State.getCurrentFileKey();
        const fileName = State.getCurrentFileName();
        if (fileKey) saveProgress(fileKey, fileName, index, imageBlobs.length);

        // Update bookmark star in HUD
        UI.updateBookmarkIndicator(index);

        // Kick off background pre-fetch once the page is visibly rendered
        prefetchAdjacentPages(index);
    };

    DOM.comicImage.onerror = () => {
        const failedImageName = imageEntry1.name || "unknown image";
        console.error("Browser failed to render image:", failedImageName, "at index:", index, "src:", DOM.comicImage.src);
        UI.showMessage(`Error loading page ${index + 1} (${failedImageName}).`);
    };
}

export function nextPage() {
    const { imageBlobs, currentImageIndex, isTwoPageSpreadActive } = State.getState();
    const step = isTwoPageSpreadActive ? 2 : 1;

    if (imageBlobs.length > 0 && currentImageIndex + step < imageBlobs.length) {
        displayPage(currentImageIndex + step);
    } else if (imageBlobs.length > 0 && isTwoPageSpreadActive && currentImageIndex + 1 < imageBlobs.length) {
        UI.showMessage("You are at the end.");
        setTimeout(UI.hideMessage, State.BOUNDARY_MESSAGE_TIMEOUT);
    } else if (imageBlobs.length > 0) {
        UI.showMessage("You are at the end.");
        setTimeout(UI.hideMessage, State.BOUNDARY_MESSAGE_TIMEOUT);
    }
}

export function prevPage() {
    const { imageBlobs, currentImageIndex, isTwoPageSpreadActive } = State.getState();
    const step = isTwoPageSpreadActive ? 2 : 1;

    if (imageBlobs.length > 0 && currentImageIndex - step >= 0) {
        displayPage(currentImageIndex - step);
    } else if (imageBlobs.length > 0 && currentImageIndex > 0) {
        // If step would go below 0, go to page 0
        displayPage(0);
    } else if (imageBlobs.length > 0) {
        UI.showMessage("You are at the beginning.");
        setTimeout(UI.hideMessage, State.BOUNDARY_MESSAGE_TIMEOUT);
    }
}
