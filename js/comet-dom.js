// js/comet-dom.js
export const uploadViewElement = document.getElementById('uploadView');
export const readerViewElement = document.getElementById('readerView');
export const views = { upload: uploadViewElement, reader: readerViewElement };
export const fileInput = document.getElementById('fileInput');
export const dropZone = document.getElementById('dropZone');
export const selectFileButton = document.getElementById('selectFileButton');
export const uploadButtonHeader = document.getElementById('uploadButtonHeader');
export const uploadButtonHeaderMobile = document.getElementById('uploadButtonHeaderMobile');
export const imageContainer = document.getElementById('imageContainer');
export const comicImage = document.getElementById('comicImage');
export const pageIndicatorHud = document.getElementById('pageIndicatorHud');
export const hudOverlay = document.getElementById('hudOverlay');
export const backButton = document.getElementById('backButton');
export const menuButton = document.getElementById('menuButton');
export const menuPanel = document.getElementById('menuPanel');
export const closeMenuButton = document.getElementById('closeMenuButton');
export const mangaModeToggle = document.getElementById('mangaModeToggle');
export const zoomInButtonPanel = document.getElementById('zoomInButtonPanel');
export const zoomOutButtonPanel = document.getElementById('zoomOutButtonPanel');
export const fitLabels = document.querySelectorAll('.fit-label');
export const readerMessage = document.getElementById('readerMessage');

// Log check for critical elements
export function checkCriticalElements() {
    if (!uploadViewElement || !readerViewElement) {
         console.error("Comet Reader: Core view elements NOT FOUND!");
         return false;
    }
    if (!fileInput) console.error("Comet Reader: fileInput element NOT FOUND!");
    if (!imageContainer) console.error("Comet Reader: imageContainer element NOT FOUND!");
    if (!comicImage) console.error("Comet Reader: comicImage element NOT FOUND!");
    return true; // Indicate if core elements seem present
}