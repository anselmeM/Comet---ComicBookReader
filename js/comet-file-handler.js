// js/comet-file-handler.js
import * as UI from './comet-ui.js';
import * as State from './comet-state.js';
import { displayPage } from './comet-navigation.js';

export async function handleFile(file) {
    const mobMenu = document.getElementById('mobileMenu');
    const hamButton = document.getElementById('hamburgerButton');
    if (mobMenu && mobMenu.classList.contains('open') && hamButton) {
        mobMenu.classList.remove('open');
        hamButton.setAttribute('aria-expanded', 'false');
        hamButton.innerHTML = `<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>`;
    }

    if (!file || !file.name.toLowerCase().endsWith('.cbz')) {
        UI.showMessage('Error: Please select a valid .cbz file.');
        setTimeout(UI.hideMessage, 3000); return;
    }
    UI.showView('reader');
    UI.showMessage('Loading ' + file.name + '...');
    try {
        const arrayBuffer = await file.arrayBuffer();
        if (!window.JSZip) throw new Error("JSZip library not loaded.");
        const zip = await JSZip.loadAsync(arrayBuffer);
        let imageFiles = [];
        const promises = [];
        for (const [filename, fileData] of Object.entries(zip.files)) {
            if (!fileData.dir && /\.(jpe?g|png|gif|webp)$/i.test(filename) && !filename.startsWith('__MACOSX/')) {
                promises.push(fileData.async("blob").then(blob => imageFiles.push({ name: filename, blob })));
            }
        }
        await Promise.all(promises);
        imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

        State.setOriginalImageBlobs([...imageFiles]);
        State.setImageBlobs([...imageFiles]);
        State.setCurrentImageIndex(0);

        if (State.getState().imageBlobs.length > 0) {
            State.setIsMangaModeActive(document.getElementById('mangaModeToggle')?.checked || false);
            if (State.getState().isMangaModeActive) State.reverseImageBlobs();
            displayPage(0);
        } else {
            throw new Error('No images found in the CBZ file.');
        }
    } catch (err) {
        console.error("Error processing CBZ:", err);
        UI.showMessage(`Error: ${err.message}`);
        setTimeout(() => { UI.hideMessage(); UI.showView('upload'); }, 3000);
    }
}