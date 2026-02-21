// js/comet-file-handler.js
import * as UI from './comet-ui.js';
import * as State from './comet-state.js';
import { displayPage } from './comet-navigation.js';
import { makeFileKey, getProgress } from './comet-progress.js';

// Supported image extensions within archive files (includes AVIF and SVG)
const IMAGE_REGEX = /\.(jpe?g|png|gif|webp|avif|svg)$/i;

// CDN URLs for optional libraries (loaded on-demand, not at startup)
const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
const PDFJS_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
const LIBARCHIVE_URL = 'https://cdn.jsdelivr.net/npm/libarchivejs@2.0.2/dist/libarchive.js';
const LIBARCHIVE_WORKER_URL = 'https://cdn.jsdelivr.net/npm/libarchivejs@2.0.2/dist/worker-bundle.js';

// Initialization flags (each lib only needs setup once per session)
let libarchiveInitialized = false;
let pdfjsWorkerSet = false;

// ---------------------------------------------------------------------------
// Dynamic script loader — injects a <script> tag and resolves when loaded.
// Safe to call multiple times for the same URL (skips if already present).
// ---------------------------------------------------------------------------
function loadScript(url) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) {
            resolve(); return; // already injected
        }
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load: ${url}`));
        document.head.appendChild(script);
    });
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function closeMobileMenu() {
    const mobMenu = document.getElementById('mobileMenu');
    const hamButton = document.getElementById('hamburgerButton');
    if (mobMenu && mobMenu.classList.contains('open') && hamButton) {
        mobMenu.classList.remove('open');
        hamButton.setAttribute('aria-expanded', 'false');
        hamButton.innerHTML = `<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>`;
    }
}

/**
 * Sorts, stores, and displays an array of image entries.
 * @param {Array} imageFiles
 */
async function finalizeAndDisplay(imageFiles) {
    imageFiles.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    State.setOriginalImageBlobs([...imageFiles]);
    State.setImageBlobs([...imageFiles]);
    State.setCurrentImageIndex(0);

    if (State.getState().imageBlobs.length > 0) {
        State.setIsMangaModeActive(document.getElementById('mangaModeToggle')?.checked || false);
        if (State.getState().isMangaModeActive) State.reverseImageBlobs();
        await displayPage(0);
    } else {
        throw new Error('No images found in the file.');
    }
}

// ---------------------------------------------------------------------------
// CBZ handler (ZIP-based, uses JSZip — already loaded globally)
// ---------------------------------------------------------------------------

async function handleCbzFile(file) {
    UI.showSkeleton();
    UI.showMessage('Loading ' + file.name + '...');
    const arrayBuffer = await file.arrayBuffer();
    if (!window.JSZip) throw new Error('JSZip library not loaded.');

    const zip = await JSZip.loadAsync(arrayBuffer);
    const imageFiles = [];
    for (const [filename, fileData] of Object.entries(zip.files)) {
        if (!fileData.dir && IMAGE_REGEX.test(filename) && !filename.startsWith('__MACOSX/')) {
            imageFiles.push({ name: filename, fileData, blob: null });
        }
    }
    await finalizeAndDisplay(imageFiles);
}

// ---------------------------------------------------------------------------
// CBR handler (RAR-based, uses libarchive.js loaded from CDN)
// ---------------------------------------------------------------------------

/**
 * Recursively flattens the nested object returned by Archive.extractFiles()
 * into a flat array of { name, file } pairs.
 */
function flattenArchiveFiles(obj, prefix = '') {
    const result = [];
    for (const [key, val] of Object.entries(obj)) {
        const path = prefix ? `${prefix}/${key}` : key;
        if (val instanceof File) {
            result.push({ name: path, file: val });
        } else if (val && typeof val === 'object') {
            result.push(...flattenArchiveFiles(val, path));
        }
    }
    return result;
}

async function handleCbrFile(file) {
    UI.showSkeleton();
    UI.showMessage('Loading ' + file.name + '...');
    await loadScript(LIBARCHIVE_URL);
    if (typeof Archive === 'undefined') throw new Error('libarchive.js failed to load.');

    if (!libarchiveInitialized) {
        Archive.init({ workerUrl: LIBARCHIVE_WORKER_URL });
        libarchiveInitialized = true;
    }

    const archive = await Archive.open(file);
    const extracted = await archive.extractFiles();

    // File objects extend Blob, so they can be used directly as blobs
    const imageFiles = flattenArchiveFiles(extracted)
        .filter(({ name }) => IMAGE_REGEX.test(name) && !name.startsWith('__MACOSX/'))
        .map(({ name, file: blob }) => ({ name, blob, fileData: null }));

    await finalizeAndDisplay(imageFiles);
}

// ---------------------------------------------------------------------------
// PDF handler (uses pdf.js loaded from CDN, renders pages lazily to canvas)
// ---------------------------------------------------------------------------

async function handlePdfFile(file) {
    UI.showSkeleton();
    UI.showMessage('Loading ' + file.name + '...');
    await loadScript(PDFJS_URL);
    if (typeof pdfjsLib === 'undefined') throw new Error('PDF.js failed to load.');

    if (!pdfjsWorkerSet) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        pdfjsWorkerSet = true;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;
    const imageFiles = [];

    // Create a lazy imageEntry for each PDF page.
    // The fileData.async() renders the page on-demand (compatible with the
    // existing lazy-loading system in comet-navigation.js).
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const paddedNum = String(pageNum).padStart(4, '0');
        imageFiles.push({
            name: `page_${paddedNum}.jpg`,
            blob: null,
            fileData: {
                async: async function (type) {
                    const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');
                    await page.render({ canvasContext: ctx, viewport }).promise;
                    return new Promise((resolve, reject) => {
                        canvas.toBlob(
                            blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
                            'image/jpeg',
                            0.92
                        );
                    });
                }
            }
        });
    }

    await finalizeAndDisplay(imageFiles);
}

// ---------------------------------------------------------------------------
// Main entry point — dispatches by file extension
// ---------------------------------------------------------------------------

export async function handleFile(file) {
    closeMobileMenu();

    const ext = file?.name?.toLowerCase().split('.').pop();
    const supported = ['cbz', 'cbr', 'pdf'];

    if (!file || !supported.includes(ext)) {
        UI.showMessage('Error: Please select a valid .cbz, .cbr, or .pdf file.');
        setTimeout(UI.hideMessage, 3000);
        return;
    }

    // Stamp current file identity on state (used by progress + bookmarks)
    const fileKey = makeFileKey(file);
    State.setCurrentFile(fileKey, file.name);

    UI.showView('reader');
    try {
        if (ext === 'cbz') await handleCbzFile(file);
        else if (ext === 'cbr') await handleCbrFile(file);
        else if (ext === 'pdf') await handlePdfFile(file);

        // --- Resume reading progress ---
        const progress = getProgress(fileKey);
        const total = State.getState().imageBlobs.length;
        if (progress && progress.lastPage > 0 && progress.lastPage < total) {
            await displayPage(progress.lastPage);
            UI.showMessage('Resumed at page ' + (progress.lastPage + 1) + ' of ' + total);
            setTimeout(UI.hideMessage, 3000);
        }
    } catch (err) {
        console.error('Error processing file:', err);
        UI.showMessage('Error: ' + err.message);
        setTimeout(() => { UI.hideMessage(); UI.showView('upload'); }, 3000);
    }
}