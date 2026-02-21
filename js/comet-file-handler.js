import * as DOM from './comet-dom.js';
import * as UI from './comet-ui.js';
import * as State from './comet-state.js';
import { displayPage } from './comet-navigation.js';
import { makeFileKey, getProgress } from './comet-progress.js';
import { loadFileSettings, applySettings } from './comet-settings.js';
import { IMAGE_REGEX, PDFJS_URL, PDFJS_WORKER_URL, LIBARCHIVE_URL, LIBARCHIVE_WORKER_URL } from './comet-constants.js';

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
    if (imageFiles.length === 0) {
        throw new Error('No valid images found in the archive.');
    }

    imageFiles.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    State.setOriginalImageBlobs([...imageFiles]);
    State.setImageBlobs([...imageFiles]);
    State.setCurrentImageIndex(0);

    State.setIsMangaModeActive(document.getElementById('mangaModeToggle')?.checked || false);

    if (State.getIsVerticalScrollActive()) {
        UI.renderVerticalScroll();
    } else {
        await displayPage(0);
    }
}

// ---------------------------------------------------------------------------
// CBZ handler (ZIP-based, uses JSZip — already loaded globally)
// ---------------------------------------------------------------------------

async function handleCbzFile(file) {
    UI.showSkeleton();
    UI.showMessage('Parsing CBZ...');

    let arrayBuffer;
    try {
        arrayBuffer = await file.arrayBuffer();
    } catch (e) {
        throw new Error('Failed to read file. It might be corrupt or inaccessible.');
    }

    if (!window.JSZip) throw new Error('JSZip library not loaded.');

    let zip;
    try {
        zip = await JSZip.loadAsync(arrayBuffer);
    } catch (e) {
        throw new Error('Invalid or corrupt CBZ file.');
    }

    const imageFiles = [];
    for (const [filename, fileData] of Object.entries(zip.files)) {
        if (!fileData.dir && IMAGE_REGEX.test(filename) && !filename.startsWith('__MACOSX/')) {
            imageFiles.push({ name: filename, fileData, blob: null });
        }
    }
    await finalizeAndDisplay(imageFiles);

    // --- Parse ComicInfo.xml for Table of Contents ---
    const comicInfoEntry = Object.entries(zip.files).find(
        ([name]) => name.toLowerCase().endsWith('comicinfo.xml') && !name.startsWith('__MACOSX/')
    );
    if (comicInfoEntry) {
        try {
            const xmlText = await comicInfoEntry[1].async('string');
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const pages = [...xmlDoc.querySelectorAll('Page[Bookmark]')];
            const toc = pages.map(p => ({
                label: p.getAttribute('Bookmark'),
                index: parseInt(p.getAttribute('Image') ?? '0', 10)
            })).filter(e => !isNaN(e.index));
            State.setTableOfContents(toc);
        } catch (e) {
            console.warn('[CoC] Failed to parse ComicInfo.xml:', e);
        }
    }
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
    UI.showMessage('Parsing CBR...');

    try {
        await loadScript(LIBARCHIVE_URL);
    } catch (e) {
        throw new Error('Failed to load RAR extraction library. Check internet connection.');
    }

    if (typeof Archive === 'undefined') throw new Error('libarchive.js failed to initialize.');

    if (!libarchiveInitialized) {
        Archive.init({ workerUrl: LIBARCHIVE_WORKER_URL });
        libarchiveInitialized = true;
    }

    let archive;
    try {
        archive = await Archive.open(file);
    } catch (e) {
        throw new Error('Failed to open CBR file. It might be corrupt or password protected.');
    }

    let extracted;
    try {
        extracted = await archive.extractFiles();
    } catch (e) {
        throw new Error('Failed to extract files from archive.');
    }

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
    UI.showMessage('Processing PDF...');

    try {
        await loadScript(PDFJS_URL);
    } catch (e) {
        throw new Error('Failed to load PDF library. Check internet connection.');
    }

    if (typeof pdfjsLib === 'undefined') throw new Error('PDF.js failed to load.');

    if (!pdfjsWorkerSet) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        pdfjsWorkerSet = true;
    }

    let arrayBuffer;
    try {
        arrayBuffer = await file.arrayBuffer();
    } catch (e) {
        throw new Error('Failed to read PDF file.');
    }

    let pdf;
    try {
        pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    } catch (e) {
        throw new Error('Invalid or corrupt PDF file.');
    }

    const pageCount = pdf.numPages;
    const imageFiles = [];

    // Create a lazy imageEntry for each PDF page.
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
        UI.showError('Unsupported File', 'Please select a valid .cbz, .cbr, or .pdf file.', true);
        return;
    }

    // Stamp current file identity on state (used by progress + bookmarks)
    const fileKey = makeFileKey(file);
    State.setCurrentFile(fileKey, file.name);

    // Apply file-specific settings overrides
    const overrides = loadFileSettings(fileKey);
    applySettings(DOM, State, UI, overrides);

    UI.showView('reader');
    try {
        if (ext === 'cbz') await handleCbzFile(file);
        else if (ext === 'cbr') await handleCbrFile(file);
        else if (ext === 'pdf') await handlePdfFile(file);

        // Clear the "Loading..." parsing phase message
        UI.hideMessage();

        // --- Show corrupt-page notice if any pages failed to decode ---
        const corruptCount = State.getCorruptPageCount();
        if (corruptCount > 0) UI.showCorruptBanner(corruptCount);
    } catch (err) {
        console.error('Error processing file:', err);
        UI.showError('Open Failed', err.message);
        setTimeout(() => { UI.hideMessage(); UI.showView('upload'); }, 4000);
    }
}
