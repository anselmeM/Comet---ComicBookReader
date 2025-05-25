// comet-reader.js
document.addEventListener('DOMContentLoaded', () => {
    const uploadViewElement = document.getElementById('uploadView');
    const readerViewElement = document.getElementById('readerView');

    if (uploadViewElement && readerViewElement) {
        console.log("Comet Reader Logic: Initializing for index.html...");

        // DOM Elements
        const views = { upload: uploadViewElement, reader: readerViewElement };
        const fileInput = document.getElementById('fileInput');
        const dropZone = document.getElementById('dropZone');
        const selectFileButton = document.getElementById('selectFileButton');
        const uploadButtonHeader = document.getElementById('uploadButtonHeader');
        const uploadButtonHeaderMobile = document.getElementById('uploadButtonHeaderMobile');
        const imageContainer = document.getElementById('imageContainer');
        const comicImage = document.getElementById('comicImage');
        const pageIndicatorHud = document.getElementById('pageIndicatorHud');
        const hudOverlay = document.getElementById('hudOverlay');
        const backButton = document.getElementById('backButton');
        const menuButton = document.getElementById('menuButton');
        const menuPanel = document.getElementById('menuPanel');
        const closeMenuButton = document.getElementById('closeMenuButton');
        const mangaModeToggle = document.getElementById('mangaModeToggle');
        const zoomInButtonPanel = document.getElementById('zoomInButtonPanel');
        const zoomOutButtonPanel = document.getElementById('zoomOutButtonPanel');
        const fitLabels = document.querySelectorAll('.fit-label');
        const readerMessage = document.getElementById('readerMessage');

        // State variables
        let imageBlobs = [], originalImageBlobs = [], currentImageIndex = 0;
        let currentObjectUrl = null, previousObjectUrl = null;
        let fitMode = 'best', isMangaModeActive = false, hudTimer = null;
        const ZOOM_STEP = 1.25, HUD_TOP_BAR_HEIGHT = '50px';
        const BOUNDARY_MESSAGE_TIMEOUT = 2500;

        // Swipe Detection variables
        let touchStartX = 0, touchEndX = 0, touchStartY = 0, touchEndY = 0;
        const swipeThreshold = 50, verticalThreshold = 75;
        let isPotentialSwipe = false;

        // ---> ADD THESE NEW VARIABLES FOR PANNING <---
        let isDragging = false;
        let dragStartX = 0, dragStartY = 0;
        let initialScrollLeft = 0, initialScrollTop = 0;
        let didDrag = false; // Flag to prevent click after drag
        // ---> END OF NEW PANNING VARIABLES <---


        function showView(viewName) { /* ... (existing code) ... */
            Object.values(views).forEach(v => v.classList.remove('active'));
            if (views[viewName]) {
                views[viewName].classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }
        function showMessage(msg) { /* ... (existing code) ... */
            if (readerMessage) {
                readerMessage.querySelector('span').textContent = msg;
                readerMessage.classList.remove('hidden');
                readerMessage.classList.add('flex');
            }
        }
        function hideMessage() { /* ... (existing code) ... */
             if (readerMessage) {
                readerMessage.classList.add('hidden');
                readerMessage.classList.remove('flex');
            }
        }
        async function handleFile(file) { /* ... (existing code) ... */
            const mobMenu = document.getElementById('mobileMenu');
            const hamButton = document.getElementById('hamburgerButton');
            if (mobMenu && mobMenu.classList.contains('open') && hamButton) {
                mobMenu.classList.remove('open');
                hamButton.setAttribute('aria-expanded', 'false');
                hamButton.innerHTML = `<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>`;
            }

            if (!file || !file.name.toLowerCase().endsWith('.cbz')) {
                showMessage('Error: Please select a valid .cbz file.');
                setTimeout(hideMessage, 3000); return;
            }
            showView('reader');
            showMessage('Loading ' + file.name + '...');
            try {
                const arrayBuffer = await file.arrayBuffer();
                if (!window.JSZip) throw new Error("JSZip library not loaded.");
                const zip = await JSZip.loadAsync(arrayBuffer);
                imageFiles = []; // Reset for new file
                const promises = [];
                for (const [filename, fileData] of Object.entries(zip.files)) {
                    if (!fileData.dir && /\.(jpe?g|png|gif|webp)$/i.test(filename) && !filename.startsWith('__MACOSX/')) {
                        promises.push(fileData.async("blob").then(blob => imageFiles.push({ name: filename, blob })));
                    }
                }
                await Promise.all(promises);
                imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                originalImageBlobs = [...imageFiles];
                imageBlobs = [...imageFiles];
                currentImageIndex = 0;
                if (imageBlobs.length > 0) {
                    isMangaModeActive = mangaModeToggle ? mangaModeToggle.checked : false;
                    if (isMangaModeActive) imageBlobs.reverse();
                    displayPage(0);
                } else {
                    throw new Error('No images found in the CBZ file.');
                }
            } catch (err) {
                console.error("Error processing CBZ:", err);
                showMessage(`Error: ${err.message}`);
                setTimeout(() => { hideMessage(); showView('upload'); }, 3000);
            }
        }
        function displayPage(index) { /* ... (existing code, with additions) ... */
            if (!imageBlobs || imageBlobs.length === 0 || !comicImage || !imageContainer) {
                showMessage("No images to display or essential elements missing."); return;
            }
            if (index < 0 || index >= imageBlobs.length) {
                currentImageIndex = Math.max(0, Math.min(index, imageBlobs.length ? imageBlobs.length - 1 : 0));
                updateUI(); return;
            }
            const imageEntry = imageBlobs[index];
            if (!imageEntry || !imageEntry.blob) {
                showMessage("Error: Corrupted image data at page " + (index + 1));
                if (comicImage) comicImage.src = ""; currentImageIndex = index; updateUI(); hideHUD(0); return;
            }
            if (previousObjectUrl) URL.revokeObjectURL(previousObjectUrl);
            currentObjectUrl = URL.createObjectURL(imageEntry.blob);
            previousObjectUrl = currentObjectUrl;

            // ---> RESET SCROLL POSITION <---
            imageContainer.scrollLeft = 0;
            imageContainer.scrollTop = 0;

            comicImage.style.opacity = 0;
            comicImage.src = currentObjectUrl;
            comicImage.onload = () => {
                if (comicImage) { applyFitMode(fitMode); comicImage.style.opacity = 1; }
                hideMessage();
            };
            comicImage.onerror = () => { /* ... */ };
            currentImageIndex = index;
            updateUI();
            hideHUD(0);
        }

        function nextPage() { /* ... (existing code) ... */
            if (imageBlobs.length > 0 && currentImageIndex < imageBlobs.length - 1) {
                displayPage(currentImageIndex + 1);
            } else if (imageBlobs.length > 0) {
                showMessage("You are at the end.");
                setTimeout(hideMessage, BOUNDARY_MESSAGE_TIMEOUT);
            }
        }
        function prevPage() { /* ... (existing code) ... */
             if (imageBlobs.length > 0 && currentImageIndex > 0) {
                displayPage(currentImageIndex - 1);
            } else if (imageBlobs.length > 0) {
                showMessage("You are at the beginning.");
                setTimeout(hideMessage, BOUNDARY_MESSAGE_TIMEOUT);
            }
        }
        function applyMangaMode() { /* ... (existing code) ... */
             if (!mangaModeToggle || !imageBlobs.length) return;
            isMangaModeActive = mangaModeToggle.checked;
            const currentName = imageBlobs[currentImageIndex]?.name;
            imageBlobs = [...originalImageBlobs];
            if (isMangaModeActive) imageBlobs.reverse();
            let newIdx = 0;
            if (currentName) {
                newIdx = imageBlobs.findIndex(img => img.name === currentName);
                if (newIdx === -1) newIdx = 0;
            }
            currentImageIndex = -1;
            displayPage(newIdx);
        }
        function showHUD() { /* ... (existing code) ... */
            if (!hudOverlay || !imageContainer) return;
            clearTimeout(hudTimer);
            hudOverlay.classList.add('visible');
            imageContainer.style.paddingTop = HUD_TOP_BAR_HEIGHT;
            hudTimer = setTimeout(hideHUD, 4000);
        }
        function hideHUD(delay = 4000) { /* ... (existing code) ... */
            if (!hudOverlay || !imageContainer) return;
            clearTimeout(hudTimer);
            if (delay === 0) {
                hudOverlay.classList.remove('visible');
                imageContainer.style.paddingTop = '0px';
            } else {
                hudTimer = setTimeout(() => {
                    hudOverlay.classList.remove('visible');
                    imageContainer.style.paddingTop = '0px';
                }, delay);
            }
        }
        function toggleHUD() { /* ... (existing code) ... */
            (hudOverlay && hudOverlay.classList.contains('visible')) ? hideHUD(0) : showHUD();
        }
        function showMenuPanel() { /* ... (existing code) ... */
            if (menuPanel) menuPanel.classList.add('visible'); hideHUD(0);
        }
        function hideMenuPanel() { /* ... (existing code) ... */
             if (menuPanel) menuPanel.classList.remove('visible');
        }

        // ---> ADD isZoomed FUNCTION <---
        function isZoomed() {
            if (!comicImage || !imageContainer) return false;
            // Check if image dimensions exceed container dimensions
            return comicImage.clientWidth > imageContainer.clientWidth ||
                   comicImage.clientHeight > imageContainer.clientHeight;
        }

        function applyFitMode(modeValue) { /* ... (existing code, with additions) ... */
            if (!comicImage || !imageContainer) return;
            fitMode = modeValue;
            comicImage.style.width = 'auto'; comicImage.style.height = 'auto';
            comicImage.style.maxWidth = 'none'; comicImage.style.maxHeight = 'none';
            // Reset scroll before applying mode
            imageContainer.scrollLeft = 0; imageContainer.scrollTop = 0;

            if (!comicImage.naturalWidth || comicImage.naturalWidth === 0) { /* ... */ return; }

            switch (fitMode) {
                case 'best': comicImage.style.maxWidth = '100%'; comicImage.style.maxHeight = '100%'; break;
                case 'width': comicImage.style.width = '100%'; comicImage.style.height = 'auto'; break;
                case 'height': comicImage.style.height = `${imageContainer.clientHeight}px`; comicImage.style.width = 'auto'; break;
                case 'original': comicImage.style.width = `${comicImage.naturalWidth}px`; comicImage.style.height = `${comicImage.naturalHeight}px`; break;
            }

            // ---> UPDATE OVERFLOW AND CURSOR <---
            // Use a small delay to allow rendering to catch up before checking zoom status
            setTimeout(() => {
                if (isZoomed()) {
                    imageContainer.style.overflow = 'auto';
                    imageContainer.style.cursor = 'grab';
                } else {
                    imageContainer.style.overflow = 'hidden';
                    imageContainer.style.cursor = 'pointer';
                }
            }, 50); // 50ms delay, adjust if needed


            if (fitLabels) fitLabels.forEach(label => { /* ... */ });
        }

        function changeZoom(factor) { /* ... (existing code, with additions) ... */
            if (!comicImage) return;
            const currentWidth = comicImage.clientWidth;
            comicImage.style.width = `${currentWidth * factor}px`;
            comicImage.style.height = 'auto';
            comicImage.style.maxWidth = 'none'; comicImage.style.maxHeight = 'none';
            fitMode = 'manual';

            // ---> UPDATE OVERFLOW AND CURSOR <---
            setTimeout(() => {
                 if (isZoomed()) {
                    imageContainer.style.overflow = 'auto';
                    imageContainer.style.cursor = 'grab';
                } else {
                    imageContainer.style.overflow = 'hidden';
                    imageContainer.style.cursor = 'pointer';
                }
            }, 50);

            if (fitLabels) fitLabels.forEach(label => { /* ... */ });
        }
        function updateUI() { /* ... (existing code) ... */
            if (pageIndicatorHud) pageIndicatorHud.textContent = imageBlobs.length > 0 ? `${currentImageIndex + 1} / ${imageBlobs.length}` : `0 / 0`;
        }


        // ---> ADD PANNING HANDLER FUNCTIONS <---
        function handlePanStart(clientX, clientY) {
            if (isZoomed()) {
                isDragging = true;
                dragStartX = clientX;
                dragStartY = clientY;
                initialScrollLeft = imageContainer.scrollLeft;
                initialScrollTop = imageContainer.scrollTop;
                imageContainer.style.cursor = 'grabbing';
                didDrag = false; // Reset drag flag
                return true; // Indicate panning might start
            }
            return false; // Indicate no panning
        }

        function handlePanMove(clientX, clientY) {
            if (isDragging) {
                const deltaX = clientX - dragStartX;
                const deltaY = clientY - dragStartY;
                imageContainer.scrollLeft = initialScrollLeft - deltaX;
                imageContainer.scrollTop = initialScrollTop - deltaY;
                // If moved more than a few pixels, consider it a drag
                if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                   didDrag = true;
                }
                return true; // Indicate panning happened
            }
            return false; // Indicate no panning
        }

        function handlePanEnd() {
            if (isDragging) {
                isDragging = false;
                if (isZoomed()) {
                   imageContainer.style.cursor = 'grab';
                } else {
                   imageContainer.style.cursor = 'pointer';
                }
                return true; // Indicate panning ended
            }
             return false;
        }


        // ---> MODIFY TOUCH HANDLER FUNCTIONS <---
        function handleTouchStart(event) {
            if (event.touches.length === 1) {
                const touch = event.touches[0];
                // Try to start panning first if zoomed
                if (!handlePanStart(touch.clientX, touch.clientY)) {
                    // If not panning (not zoomed), handle as potential swipe
                    touchStartX = touch.clientX;
                    touchStartY = touch.clientY;
                    touchEndX = touchStartX;
                    touchEndY = touchStartY;
                    isPotentialSwipe = true;
                } else {
                    // If panning started, it's not a potential swipe
                    isPotentialSwipe = false;
                }
            }
        }

        function handleTouchMove(event) {
            if (event.touches.length === 1) {
                const touch = event.touches[0];
                // If panning, move the image
                if (handlePanMove(touch.clientX, touch.clientY)) {
                    event.preventDefault(); // Prevent scroll only when panning
                }
                // If it *could* be a swipe (and not panning)
                else if (isPotentialSwipe) {
                    touchEndX = touch.clientX;
                    touchEndY = touch.clientY;
                    const deltaX = touchEndX - touchStartX;
                    const deltaY = touchEndY - touchStartY;
                    // Check if it looks like a horizontal swipe, then prevent default
                    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                        event.preventDefault();
                    }
                }
            }
        }

        function handleTouchEnd(event) {
            // If we were panning, just end the pan
            if (handlePanEnd()) {
                 // Panning ended, do nothing else
            }
            // If it was a potential swipe (and not a pan)
            else if (isPotentialSwipe) {
                const deltaX = touchEndX - touchStartX;
                const deltaY = touchEndY - touchStartY;
                // Check if it meets swipe criteria
                if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaY) < verticalThreshold) {
                    if (deltaX < 0) { // Swiped left
                        isMangaModeActive ? prevPage() : nextPage();
                    } else { // Swiped right
                        isMangaModeActive ? nextPage() : prevPage();
                    }
                }
                // Reset swipe state
                isPotentialSwipe = false;
                touchStartX = 0; touchEndX = 0; touchStartY = 0; touchEndY = 0;
            }
        }


        // Event Listeners for index.html
        if (selectFileButton) { /* ... */ }
        if (uploadButtonHeader) { /* ... */ }
        if (uploadButtonHeaderMobile) { /* ... */ }
        if (fileInput) { /* ... */ }
        if (dropZone) { /* ... */ }

        if (imageContainer) {
            // ---> MODIFY CLICK LISTENER <---
            imageContainer.addEventListener('click', (event) => {
                // If a drag just happened, don't process click
                if (didDrag) {
                    didDrag = false; // Reset flag and ignore click
                    return;
                }

                if (menuPanel && menuPanel.classList.contains('visible')) return;
                const scrollbarWidth = 17;
                if (event.offsetX >= imageContainer.clientWidth - scrollbarWidth || event.offsetY >= imageContainer.clientHeight - scrollbarWidth) return;
                if (hudOverlay && hudOverlay.classList.contains('visible') && event.target.closest('.hud-icon')) {
                    showHUD(); return;
                }
                // Don't navigate if zoomed - user likely wants to pan/zoom more
                if (isZoomed()) {
                     toggleHUD();
                     return;
                }

                const rect = imageContainer.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const containerWidth = imageContainer.clientWidth;

                if (x < containerWidth * 0.25) { isMangaModeActive ? nextPage() : prevPage(); }
                else if (x > containerWidth * 0.75) { isMangaModeActive ? prevPage() : nextPage(); }
                else { toggleHUD(); }
            });

            // ---> ADD MOUSE LISTENERS FOR PANNING <---
            imageContainer.addEventListener('mousedown', (event) => {
                 if (event.button !== 0) return; // Only handle left clicks
                 if (handlePanStart(event.clientX, event.clientY)) {
                    event.preventDefault();
                 }
            });

            document.addEventListener('mousemove', (event) => {
                if (handlePanMove(event.clientX, event.clientY)) {
                    event.preventDefault();
                }
            });

            document.addEventListener('mouseup', (event) => {
                handlePanEnd();
            });
            // Also end drag if mouse leaves the window
             document.addEventListener('mouseleave', (event) => {
                handlePanEnd();
            });


            // Touch Event Listeners (Swipe + Pan)
            imageContainer.addEventListener('touchstart', handleTouchStart, { passive: false }); // Needs passive:false for preventDefault
            imageContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
            imageContainer.addEventListener('touchend', handleTouchEnd);
            imageContainer.addEventListener('touchcancel', handleTouchEnd);
        }

        if (hudOverlay) { /* ... */ }
        if (backButton) { /* ... */ }
        if (menuButton) { /* ... */ }
        if (closeMenuButton) { /* ... */ }
        if (mangaModeToggle) { /* ... */ }
        if (zoomInButtonPanel) { /* ... */ }
        if (zoomOutButtonPanel) { /* ... */ }
        if (fitLabels) { /* ... */ }
        document.addEventListener('keydown', (e) => { /* ... */ });

        showView('upload');
        if (mangaModeToggle) isMangaModeActive = mangaModeToggle.checked;
        applyFitMode('best');
        imageContainer.style.overflow = 'hidden'; // Start hidden
        imageContainer.style.cursor = 'pointer'; // Start as pointer

        console.log("Index.html specific logic: Initialization COMPLETE.");
    } else {
        console.log("Not on index.html (or core elements 'uploadView'/'readerView' missing), skipping reader initialization.");
        document.body.style.overflow = '';
    }
});