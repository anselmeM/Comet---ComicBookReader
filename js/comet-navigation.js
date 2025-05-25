// js/comet-navigation.js
import * as DOM from './comet-dom.js';
import * as State from './comet-state.js';
import * as UI from './comet-ui.js';

export function displayPage(index) {
    let { imageBlobs, currentImageIndex, previousObjectUrl } = State.getState();
    if (!imageBlobs || imageBlobs.length === 0 || !DOM.comicImage || !DOM.imageContainer) {
        UI.showMessage("No images to display or essential elements missing."); return;
    }
    if (index < 0 || index >= imageBlobs.length) {
        State.setCurrentImageIndex(Math.max(0, Math.min(index, imageBlobs.length ? imageBlobs.length - 1 : 0)));
        UI.updateUI(); return;
    }
    const imageEntry = imageBlobs[index];
    if (!imageEntry || !imageEntry.blob) {
        UI.showMessage("Error: Corrupted image data at page " + (index + 1));
        if (DOM.comicImage) DOM.comicImage.src = ""; State.setCurrentImageIndex(index); UI.updateUI(); UI.hideHUD(0); return;
    }
    if (previousObjectUrl) URL.revokeObjectURL(previousObjectUrl);
    const newUrl = URL.createObjectURL(imageEntry.blob);
    State.setCurrentObjectUrl(newUrl);
    State.setPreviousObjectUrl(newUrl);

    DOM.imageContainer.scrollLeft = 0;
    DOM.imageContainer.scrollTop = 0;

    DOM.comicImage.style.opacity = 0;
    DOM.comicImage.src = newUrl;
    DOM.comicImage.onload = () => {
        if (DOM.comicImage) { UI.applyFitMode(State.getState().fitMode); DOM.comicImage.style.opacity = 1; }
        UI.hideMessage();
    };
    DOM.comicImage.onerror = () => {
        const failedImageName = imageEntry.name || "unknown image";
        console.error("Browser failed to render image:", failedImageName, "at index:", index, "src:", DOM.comicImage.src);
        UI.showMessage(`Error loading page ${index + 1} (${failedImageName}).`);
    };
    State.setCurrentImageIndex(index);
    UI.updateUI();
    UI.hideHUD(0);
}

export function nextPage() {
    const { imageBlobs, currentImageIndex } = State.getState();
    if (imageBlobs.length > 0 && currentImageIndex < imageBlobs.length - 1) {
        displayPage(currentImageIndex + 1);
    } else if (imageBlobs.length > 0) {
        UI.showMessage("You are at the end.");
        setTimeout(UI.hideMessage, State.BOUNDARY_MESSAGE_TIMEOUT);
    }
}

export function prevPage() {
    const { imageBlobs, currentImageIndex } = State.getState();
    if (imageBlobs.length > 0 && currentImageIndex > 0) {
        displayPage(currentImageIndex - 1);
    } else if (imageBlobs.length > 0) {
        UI.showMessage("You are at the beginning.");
        setTimeout(UI.hideMessage, State.BOUNDARY_MESSAGE_TIMEOUT);
    }
}