// js/comet-navigation.js
import * as DOM from './comet-dom.js';
import * as State from './comet-state.js';
import * as UI from './comet-ui.js';

async function loadImageBlob(index) {
    const { imageBlobs } = State.getState();
    if (index < 0 || index >= imageBlobs.length) return null;

    const imageEntry = imageBlobs[index];
    if (imageEntry && !imageEntry.blob && imageEntry.fileData) {
        try {
            imageEntry.blob = await imageEntry.fileData.async("blob");
        } catch (e) {
            console.error("Failed to lazy load image at index " + index, e);
            return null;
        }
    }
    return imageEntry;
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

    if (!imageEntry1 || !imageEntry1.blob) {
        UI.showMessage("Error: Corrupted image data at page " + (index + 1));
        if (DOM.comicImage) DOM.comicImage.src = "";
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
    // Simplification: Wait for primary image load.
    DOM.comicImage.onload = () => {
        if (DOM.comicImage) {
             DOM.comicImage.style.opacity = 1;
             if (DOM.comicImage2 && url2) DOM.comicImage2.style.opacity = 1;
             UI.applyFitMode(State.getState().fitMode);
        }
        UI.hideMessage();
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
         // Special case: we are at N-1, and step is 2. Next would be N+1 (invalid).
         // But we might want to just show the last page alone if it was paired weirdly?
         // Actually, if we are at N-1 (second to last), and we show N-1 and N. We are at the end.
         // If we are at N-1 (last page because 0-indexed count-1), we are at end.
         // The condition `currentImageIndex + step < imageBlobs.length` handles most.
         // Example: Length 10. Index 8. Step 2. 8+2=10. Not < 10.
         // So we stay at 8 (showing 8, 9). User clicks next. "You are at the end." Correct.
         // Example: Length 11. Index 8. Step 2. 8+2=10. 10 < 11.
         // Goto 10. Show 10 (and 11 is missing). Correct.

         // Only case: user wants to see the very last page alone if it was part of a pair but they want to advance?
         // No, standard behavior is fine.

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
        // If we are at index 1 (step 2 would be -1), go to 0.
        displayPage(0);
    } else if (imageBlobs.length > 0) {
        UI.showMessage("You are at the beginning.");
        setTimeout(UI.hideMessage, State.BOUNDARY_MESSAGE_TIMEOUT);
    }
}
