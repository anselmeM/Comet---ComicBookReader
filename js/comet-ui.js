// js/comet-ui.js
import * as DOM from './comet-dom.js';
import * as State from './comet-state.js';
import { displayPage, loadImageBlob } from './comet-navigation.js';
import { isBookmarked, getBookmarks } from './comet-bookmarks.js';
import { getAllProgress, saveProgress } from './comet-progress.js';
import { getHandle } from './comet-library.js';

let verticalObserver = null;

// --- View Management ---
// ... (showView, showUploadView - unchanged) ...
export function showView(viewName) {
    Object.values(DOM.views).forEach(v => v.classList.remove('active'));
    if (DOM.views[viewName]) {
        DOM.views[viewName].classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}
export function showUploadView() {
    showView('upload');
    State.resetAllState();
    if (DOM.comicImage) { DOM.comicImage.onerror = null; DOM.comicImage.src = ""; }
    if (DOM.comicImage2) { DOM.comicImage2.onerror = null; DOM.comicImage2.src = ""; DOM.comicImage2.classList.add('hidden'); }
    updateUI();
    if (DOM.menuPanel) DOM.menuPanel.classList.remove('visible');
    hideMessage();
    document.body.style.overflow = '';
    renderRecentFiles();
}

// --- Message Handling ---
// ... (showMessage, hideMessage - unchanged) ...
export function showMessage(msg) {
    if (DOM.readerMessage) {
        DOM.readerMessage.querySelector('span').textContent = msg;
        DOM.readerMessage.classList.remove('hidden');
        DOM.readerMessage.classList.add('flex');
    }
}
export function hideMessage() {
    if (DOM.readerMessage) {
        DOM.readerMessage.classList.add('hidden');
        DOM.readerMessage.classList.remove('flex');
    }
}

// --- HUD & Menu ---
// ... (showHUD, hideHUD, toggleHUD, showMenuPanel, hideMenuPanel - unchanged) ...
export function showHUD() {
    if (!DOM.hudOverlay || !DOM.imageContainer) return;
    clearTimeout(State.getState().hudTimer);
    DOM.hudOverlay.classList.add('visible');
    DOM.imageContainer.style.paddingTop = State.HUD_TOP_BAR_HEIGHT;
    State.setHudTimer(setTimeout(hideHUD, 4000));
}
export function hideHUD(delay = 4000) {
    if (!DOM.hudOverlay || !DOM.imageContainer) return;
    clearTimeout(State.getState().hudTimer);
    const action = () => {
        DOM.hudOverlay.classList.remove('visible');
        DOM.imageContainer.style.paddingTop = '0px';
    };
    if (delay === 0) {
        action();
    } else {
        State.setHudTimer(setTimeout(action, delay));
    }
}
export function toggleHUD() { (DOM.hudOverlay && DOM.hudOverlay.classList.contains('visible')) ? hideHUD(0) : showHUD(); }
export function showMenuPanel() {
    if (DOM.menuPanel) {
        DOM.menuPanel.classList.add('visible');
        const first = DOM.menuPanel.querySelector(
            'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (first) setTimeout(() => first.focus(), 50);
    }
    hideHUD(0);
    renderBookmarkList();
    renderTableOfContents();
}
export function hideMenuPanel() {
    if (DOM.menuPanel) DOM.menuPanel.classList.remove('visible');
    DOM.menuButton?.focus();
}

// --- Jump-to-Page Input ---
export function showPageJumpInput() {
    const indicator = document.getElementById('pageIndicatorHud');
    const input = document.getElementById('pageJumpInput');
    if (!indicator || !input) return;
    const { currentImageIndex, imageBlobs } = State.getState();
    input.max = String(imageBlobs.length);
    input.value = String(currentImageIndex + 1);
    indicator.classList.add('hidden');
    input.classList.remove('hidden');
    input.focus();
    input.select();
}
export function hidePageJumpInput() {
    const indicator = document.getElementById('pageIndicatorHud');
    const input = document.getElementById('pageJumpInput');
    if (!indicator || !input) return;
    input.classList.add('hidden');
    indicator.classList.remove('hidden');
}

// --- Fullscreen ---
export function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err =>
            console.warn('Fullscreen request failed:', err)
        );
    } else {
        document.exitFullscreen();
    }
}
export function updateFullscreenIcon() {
    const btn = document.getElementById('fullscreenButton');
    if (!btn) return;
    const isFs = !!document.fullscreenElement;
    btn.innerHTML = isFs
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>`;
    btn.setAttribute('aria-label', isFs ? 'Exit Fullscreen' : 'Enter Fullscreen');
}


// --- Zoom & Fit ---
export function isZoomed() {
    if (!DOM.imageContainer) return false;
    // Check if scroll dimensions exceed client dimensions (add a small tolerance)
    return DOM.imageContainer.scrollWidth > DOM.imageContainer.clientWidth + 1 ||
        DOM.imageContainer.scrollHeight > DOM.imageContainer.clientHeight + 1;
}

/**
 * Centers the image within the container if it's zoomed in.
 */
function centerImageIfZoomed() {
    if (isZoomed() && DOM.imageContainer) {
        const scrollWidth = DOM.imageContainer.scrollWidth;
        const scrollHeight = DOM.imageContainer.scrollHeight;
        const clientWidth = DOM.imageContainer.clientWidth;
        const clientHeight = DOM.imageContainer.clientHeight;

        // Calculate how much the content overflows the container
        const overflowX = scrollWidth - clientWidth;
        const overflowY = scrollHeight - clientHeight;

        // Set scrollLeft/Top to half the overflow (if positive) to center it
        // Note: this centers initially.
        DOM.imageContainer.scrollLeft = overflowX > 0 ? overflowX / 2 : 0;
        DOM.imageContainer.scrollTop = overflowY > 0 ? overflowY / 2 : 0;
    } else if (DOM.imageContainer) {
        // If not zoomed, ensure scroll is reset
        DOM.imageContainer.scrollLeft = 0;
        DOM.imageContainer.scrollTop = 0;
    }
}

/**
 * Updates the container's overflow and cursor based on zoom state.
 * Also calls centerImageIfZoomed.
 */
function updateZoomStateUI(center = false) {
    setTimeout(() => {
        if (isZoomed()) {
            DOM.imageContainer.style.overflow = 'auto'; // Allow scrolling
            DOM.imageContainer.style.cursor = 'grab';   // Indicate grabbable
        } else {
            DOM.imageContainer.style.overflow = 'hidden';// Hide scrollbars
            DOM.imageContainer.style.cursor = 'pointer'; // Indicate clickable
        }
        if (center) {
            centerImageIfZoomed();
        }
    }, 50); // Delay allows browser to render new size before calculating/scrolling
}

// ---> REVISED: applyFitMode <---
export function applyFitMode(modeValue) {
    if (!DOM.comicImage || !DOM.imageContainer) return;
    State.setFitMode(modeValue);

    // Wait for load if not complete (simple check on first image)
    if (!DOM.comicImage.naturalWidth || DOM.comicImage.naturalWidth === 0) {
        if (!DOM.comicImage.complete && DOM.comicImage.src && !DOM.comicImage.src.startsWith("file:")) {
            DOM.comicImage.addEventListener('load', () => applyFitMode(modeValue), { once: true });
        }
        // If two page, we might want to wait for second too, but usually they load close together or we call applyFitMode again on load.
        return;
    }

    const isTwoPage = State.getState().isTwoPageSpreadActive;
    const imgs = isTwoPage ? [DOM.comicImage, DOM.comicImage2] : [DOM.comicImage];

    // Reset styles
    imgs.forEach(img => {
        if (!img) return;
        img.style.width = 'auto'; img.style.height = 'auto';
        img.style.maxWidth = 'none'; img.style.maxHeight = 'none';
        // Note: we let tailwind handle flex/object-contain
    });

    // Reset scroll before applying mode
    DOM.imageContainer.scrollLeft = 0; DOM.imageContainer.scrollTop = 0;

    const mode = State.getState().fitMode;

    if (isTwoPage && DOM.comicImage2.src && DOM.comicImage2.src !== window.location.href) {
        DOM.comicImage2.classList.remove('hidden');
        DOM.comicImage2.style.display = '';
        switch (mode) {
            case 'best':
                imgs.forEach(img => { img.style.maxWidth = '50%'; img.style.maxHeight = '100%'; });
                break;
            case 'width':
                imgs.forEach(img => { img.style.width = '50%'; img.style.height = 'auto'; });
                break;
            case 'height':
                imgs.forEach(img => { img.style.height = `${DOM.imageContainer.clientHeight}px`; img.style.width = 'auto'; });
                break;
            case 'original':
                imgs.forEach(img => { img.style.width = `${img.naturalWidth}px`; img.style.height = `${img.naturalHeight}px`; });
                break;
        }
    } else {
        DOM.comicImage2.classList.add('hidden');
        DOM.comicImage2.style.display = 'none';
        switch (mode) {
            case 'best': DOM.comicImage.style.maxWidth = '100%'; DOM.comicImage.style.maxHeight = '100%'; break;
            case 'width': DOM.comicImage.style.width = '100%'; DOM.comicImage.style.height = 'auto'; break;
            case 'height': DOM.comicImage.style.height = `${DOM.imageContainer.clientHeight}px`; DOM.comicImage.style.width = 'auto'; break;
            case 'original': DOM.comicImage.style.width = `${DOM.comicImage.naturalWidth}px`; DOM.comicImage.style.height = `${DOM.comicImage.naturalHeight}px`; break;
        }
    }

    // Update UI and center the image (important for 'original')
    updateZoomStateUI(true); // <-- Pass true to center

    if (DOM.fitLabels) DOM.fitLabels.forEach(label => {
        const radio = label.querySelector('input');
        if (radio) { label.classList.toggle('checked', radio.value === State.getState().fitMode); radio.checked = radio.value === State.getState().fitMode; }
    });
}

// ---> Vertical Scroll Functions <---
export function toggleVerticalScroll(isActive) {
    const vc = document.getElementById('verticalScrollContainer');
    if (!vc) return;
    if (isActive) {
        DOM.imageContainer.classList.add('hidden');
        vc.classList.remove('hidden');
        renderVerticalScroll();
    } else {
        vc.classList.add('hidden');
        DOM.imageContainer.classList.remove('hidden');
        if (verticalObserver) {
            verticalObserver.disconnect();
            verticalObserver = null;
        }
        vc.innerHTML = '';
        displayPage(State.getState().currentImageIndex || 0);
    }
}

export function renderVerticalScroll() {
    const vc = document.getElementById('verticalScrollContainer');
    if (!vc) return;
    vc.innerHTML = '';

    const { imageBlobs, currentImageIndex } = State.getState();
    if (!imageBlobs || imageBlobs.length === 0) return;

    if (verticalObserver) verticalObserver.disconnect();

    verticalObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const idx = parseInt(entry.target.dataset.index, 10);
            if (entry.isIntersecting) {
                if (!entry.target.dataset.loaded) {
                    loadImageBlob(idx).then(imgEntry => {
                        if (imgEntry && imgEntry.blob) {
                            let url = State.getCachedObjectUrl(imgEntry);
                            if (!url) {
                                url = URL.createObjectURL(imgEntry.blob);
                                State.addObjectUrl(imgEntry, url);
                            }
                            entry.target.src = url;
                            entry.target.dataset.loaded = 'true';
                        }
                    });
                }

                if (entry.intersectionRatio > 0.5) {
                    State.setCurrentImageIndex(idx);
                    updateBookmarkIndicator(idx);
                    const indicator = document.getElementById('pageIndicatorHud');
                    if (indicator) indicator.textContent = `${idx + 1} / ${imageBlobs.length}`;

                    const fileKey = State.getCurrentFileKey();
                    if (fileKey) saveProgress(fileKey, State.getCurrentFileName(), idx, imageBlobs.length);
                }
            }
        });
    }, { root: vc, rootMargin: '100% 0px', threshold: [0, 0.5] });

    imageBlobs.forEach((_, i) => {
        const img = document.createElement('img');
        img.className = 'w-full max-w-[800px] mx-auto block min-h-[50vh] object-contain';
        img.dataset.index = i;
        vc.appendChild(img);
        verticalObserver.observe(img);
    });

    const targetImg = vc.querySelector(`img[data-index="${currentImageIndex}"]`);
    if (targetImg) {
        setTimeout(() => targetImg.scrollIntoView(), 100);
    }

    // Hide loading overlays since the vertical scroll container is now rendered
    hideSkeleton();
    hideMessage();
}

// ---> REVISED: changeZoom <---
export function changeZoom(factor) {
    if (!DOM.comicImage) return;

    const isTwoPage = State.getState().isTwoPageSpreadActive;
    const imgs = isTwoPage ? [DOM.comicImage, DOM.comicImage2] : [DOM.comicImage];

    imgs.forEach(img => {
        if (!img) return;
        const currentWidth = img.clientWidth;
        img.style.width = `${currentWidth * factor}px`;
        img.style.height = 'auto';
        img.style.maxWidth = 'none'; img.style.maxHeight = 'none';
    });

    State.setFitMode('manual');

    // Update UI and center the image
    updateZoomStateUI(true); // <-- Pass true to center

    if (DOM.fitLabels) DOM.fitLabels.forEach(label => {
        label.classList.remove('checked');
        const radio = label.querySelector('input'); if (radio) radio.checked = false;
    });
}

// --- Manga Mode & UI Update ---
// ... (applyMangaMode, updateUI - unchanged) ...
export function applyMangaMode() {
    if (!DOM.mangaModeToggle || !State.getState().imageBlobs.length) return;
    const isManga = DOM.mangaModeToggle.checked;
    State.setIsMangaModeActive(isManga);

    // Visually toggle left/right image ordering in two-page spread via flexbox
    if (DOM.imageContainer) {
        if (isManga) {
            DOM.imageContainer.classList.add('flex-row-reverse');
        } else {
            DOM.imageContainer.classList.remove('flex-row-reverse');
        }
    }

    displayPage(State.getState().currentImageIndex);
}

export function toggleTwoPageMode() {
    if (!DOM.twoPageToggle) return;
    State.setIsTwoPageSpreadActive(DOM.twoPageToggle.checked);
    displayPage(State.getState().currentImageIndex);
}

/** Shows a shimmer placeholder while a file is being parsed. */
export function showSkeleton() { DOM.imageContainer?.classList.add('loading'); }
/** Hides the shimmer placeholder once the first page renders. */
export function hideSkeleton() { DOM.imageContainer?.classList.remove('loading'); }

/**
 * Shows the amber corrupt-page banner at the bottom of the reader.
 * @param {number} count  Number of pages that failed to decode.
 */
export function showCorruptBanner(count) {
    const banner = document.getElementById('corruptBanner');
    const text = document.getElementById('corruptBannerText');
    if (!banner || !text || count <= 0) return;
    const pages = count === 1 ? 'page' : 'pages';
    const were = count === 1 ? 'was' : 'were';
    text.textContent = '\u26A0\uFE0F ' + count + ' ' + pages + " couldn't be decoded and " + were + ' skipped.';
    banner.classList.remove('hidden');
}

/** Hides the corrupt-page banner. */
export function hideCorruptBanner() {
    document.getElementById('corruptBanner')?.classList.add('hidden');
}

/**
 * Renders the Table of Contents (from ComicInfo.xml) in the Options panel.
 * The section is shown only when chapters are present.
 */
export function renderTableOfContents() {
    const section = document.getElementById('tocSection');
    const list = document.getElementById('tocList');
    if (!section || !list) return;
    const toc = State.getTableOfContents();
    if (!toc || toc.length === 0) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');
    list.innerHTML = toc.map(entry =>
        '<button class="toc-item w-full text-left px-4 py-2 text-sm text-[#0d141c] dark:text-[#E7EDF4] ' +
        'hover:bg-[#e7edf4] dark:hover:bg-gray-700 transition-colors" ' +
        'data-index="' + entry.index + '">' +
        '<span class="font-medium">' + entry.label + '</span>' +
        '<span class="text-xs text-[#49739c] dark:text-gray-400 ml-2">p.' + (entry.index + 1) + '</span>' +
        '</button>'
    ).join('');

    // Wire click handlers
    list.querySelectorAll('.toc-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index, 10);
            if (!isNaN(idx)) {
                displayPage(idx);
                hideMenuPanel();
            }
        });
    });
}
export function applyPageBackground(color) {
    const bg = { black: '#111111', gray: '#555555', white: '#ffffff' };
    if (DOM.imageContainer) {
        DOM.imageContainer.style.backgroundColor = bg[color] ?? bg.black;
    }
    // Update swatch ring
    ['bgBlack', 'bgGray', 'bgWhite'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.toggle('ring-2', btn.dataset.color === color);
    });
}

/**
 * Updates the HUD bookmark button (filled star = bookmarked, outline = not).
 * @param {number} pageIndex
 */
export function updateBookmarkIndicator(pageIndex) {
    const btn = document.getElementById('bookmarkButton');
    if (!btn) return;
    const fileKey = State.getCurrentFileKey();
    const bookmarked = fileKey ? isBookmarked(fileKey, pageIndex) : false;
    document.getElementById('bookmarkIconOutline')?.classList.toggle('hidden', bookmarked);
    document.getElementById('bookmarkIconFilled')?.classList.toggle('hidden', !bookmarked);
    btn.setAttribute('aria-label', bookmarked ? 'Remove bookmark' : 'Bookmark this page');
}

/**
 * Renders the bookmark jump-list inside the Options panel.
 * Called every time the menu panel opens.
 */
export function renderBookmarkList() {
    const list = document.getElementById('bookmarkList');
    if (!list) return;
    const fileKey = State.getCurrentFileKey();
    if (!fileKey) {
        list.innerHTML = '<p class="text-sm text-[#49739c] dark:text-gray-400 px-4 pb-3">Open a file to use bookmarks.</p>';
        return;
    }
    const pages = getBookmarks(fileKey);
    if (pages.length === 0) {
        list.innerHTML = '<p class="text-sm text-[#49739c] dark:text-gray-400 px-4 pb-3">No bookmarks yet. Tap \u2605 while reading to add one.</p>';
        return;
    }
    list.innerHTML = pages.map(idx =>
        '<button class="bm-jump flex items-center gap-2 w-full px-4 py-2 text-sm text-left ' +
        'text-[#0d141c] dark:text-[#E7EDF4] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded" ' +
        'data-page="' + idx + '">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b"><path d="M5 2h14a1 1 0 0 1 1 1v18l-7-3-7 3V3a1 1 0 0 1 1-1z"/></svg>' +
        'Page ' + (idx + 1) +
        '</button>'
    ).join('');
    list.querySelectorAll('.bm-jump').forEach(btn => {
        btn.addEventListener('click', () => {
            displayPage(parseInt(btn.dataset.page, 10));
            hideMenuPanel();
        });
    });
}

/**
 * Renders the recent-files history list on the upload screen.
 * Async so it can check IndexedDB for stored file handles.
 */
export async function renderRecentFiles() {
    const section = document.getElementById('recentFilesSection');
    if (!section) return;
    const history = getAllProgress();
    if (history.length === 0) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');
    const listEl = section.querySelector('#recentFilesList');
    if (!listEl) return;
    listEl.innerHTML = history.map(entry => {
        const pct = entry.totalPages > 0
            ? Math.min(100, Math.round((entry.lastPage + 1) / entry.totalPages * 100))
            : 0;
        return '<div class="flex flex-col gap-1">' +
            '<div class="flex justify-between items-center gap-2">' +
            '<span class="text-sm font-medium text-[#0d141c] dark:text-[#E7EDF4] truncate">' + entry.fileName + '</span>' +
            '<div class="flex items-center gap-2 shrink-0">' +
            '<span class="text-xs text-[#49739c] dark:text-gray-400">p.' + (entry.lastPage + 1) + ' / ' + entry.totalPages + '</span>' +
            '<button class="lib-reopen hidden text-xs font-semibold text-[#3d98f4] hover:text-blue-700 transition-colors" ' +
            'data-filekey="' + entry.key + '">Open</button>' +
            '</div></div>' +
            '<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">' +
            '<div class="bg-[#3d98f4] h-1.5 rounded-full" style="width:' + pct + '%"></div>' +
            '</div></div>';
    }).join('');

    // Asynchronously reveal "Open" buttons for entries with stored handles
    for (const entry of history) {
        const btn = listEl.querySelector('[data-filekey="' + entry.key + '"]');
        if (!btn) continue;
        const handle = await getHandle(entry.key);
        if (handle) {
            btn.classList.remove('hidden');
            btn.addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent('comet:reopen', { detail: { fileKey: entry.key } }));
            });
        }
    }
}

export function updateUI() {
    if (DOM.pageIndicatorHud) {
        const { currentImageIndex, imageBlobs, isTwoPageSpreadActive } = State.getState();
        const total = imageBlobs.length;
        let text = '';
        if (total === 0) {
            text = '0 / 0';
        } else if (isTwoPageSpreadActive && currentImageIndex + 1 < total) {
            text = (currentImageIndex + 1) + '-' + (currentImageIndex + 2) + ' / ' + total;
        } else {
            text = (currentImageIndex + 1) + ' / ' + total;
        }
        DOM.pageIndicatorHud.textContent = text;

        // ARIA live announcement for screen readers
        const announcer = document.getElementById('a11yAnnouncer');
        if (announcer && total > 0) {
            announcer.textContent = isTwoPageSpreadActive && currentImageIndex + 1 < total
                ? 'Pages ' + (currentImageIndex + 1) + ' and ' + (currentImageIndex + 2) + ' of ' + total
                : 'Page ' + (currentImageIndex + 1) + ' of ' + total;
        }
    }
}
