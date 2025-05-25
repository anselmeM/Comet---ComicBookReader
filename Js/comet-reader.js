// comet-reader.js
document.addEventListener('DOMContentLoaded', () => {
    const uploadViewElement = document.getElementById('uploadView');
    const readerViewElement = document.getElementById('readerView');

    if (uploadViewElement && readerViewElement) {
        console.log("Comet Reader Logic: Initializing for index.html...");

        // DOM Elements specific to index.html
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
        
        // Log found elements for index.html (critical ones)
        if (!fileInput) console.error("Comet Reader: fileInput element NOT FOUND!");
        if (!imageContainer) console.error("Comet Reader: imageContainer element NOT FOUND!");
        if (!comicImage) console.error("Comet Reader: comicImage element NOT FOUND!");


        // State variables
        let imageBlobs = [], originalImageBlobs = [], currentImageIndex = 0;
        let currentObjectUrl = null, previousObjectUrl = null;
        let fitMode = 'best', isMangaModeActive = false, hudTimer = null;
        const ZOOM_STEP = 1.25, HUD_TOP_BAR_HEIGHT = '50px';
        const BOUNDARY_MESSAGE_TIMEOUT = 2500;

        function showView(viewName) {
            Object.values(views).forEach(v => v.classList.remove('active'));
            if (views[viewName]) {
                views[viewName].classList.add('active');
                document.body.style.overflow = 'hidden'; 
            }
        }
        function showMessage(msg) {
            if (readerMessage) {
                readerMessage.querySelector('span').textContent = msg;
                readerMessage.classList.remove('hidden');
                readerMessage.classList.add('flex');
            }
        }
        function hideMessage() {
            if (readerMessage) {
                readerMessage.classList.add('hidden');
                readerMessage.classList.remove('flex');
            }
        }
        async function handleFile(file) {
            // The globalMobileMenu and globalHamburgerButton are from the global-ui.js scope.
            // For this to work perfectly, global-ui.js must have executed and defined them,
            // or these elements must be re-fetched here if this script is entirely independent.
            // For simplicity, assuming they are accessible if global-ui.js runs first.
            const mobMenu = document.getElementById('mobileMenu'); // Re-fetch for safety within this module if needed
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
                imageBlobs = []; // Reset for new file
                const promises = [];
                for (const [filename, fileData] of Object.entries(zip.files)) {
                    if (!fileData.dir && /\.(jpe?g|png|gif|webp)$/i.test(filename) && !filename.startsWith('__MACOSX/')) {
                        promises.push(fileData.async("blob").then(blob => imageBlobs.push({ name: filename, blob })));
                    }
                }
                await Promise.all(promises);
                imageBlobs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                originalImageBlobs = [...imageBlobs];
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
        function displayPage(index) {
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
                if(comicImage) comicImage.src = ""; currentImageIndex = index; updateUI(); hideHUD(0); return;
            }
            if (previousObjectUrl) URL.revokeObjectURL(previousObjectUrl);
            currentObjectUrl = URL.createObjectURL(imageEntry.blob);
            previousObjectUrl = currentObjectUrl;
            
            console.log(`Displaying: ${imageEntry.name} (Blob Type: ${imageEntry.blob.type || 'N/A'}, Size: ${imageEntry.blob.size})`);

            comicImage.style.opacity = 0;
            comicImage.src = currentObjectUrl;
            comicImage.onload = () => {
                if(comicImage) { applyFitMode(fitMode); comicImage.style.opacity = 1; }
                hideMessage();
            };
            comicImage.onerror = () => {
                const failedImageName = imageEntry.name || "unknown image";
                console.error("Browser failed to render image:", failedImageName, "at index:", index, "src:", comicImage.src);
                showMessage(`Error loading page ${index + 1} (${failedImageName}). Image may be corrupted/unsupported.`);
            };
            currentImageIndex = index; 
            updateUI();
            hideHUD(0);
        }
        
        function nextPage() {
            if (imageBlobs.length > 0 && currentImageIndex < imageBlobs.length - 1) {
                displayPage(currentImageIndex + 1);
            } else if (imageBlobs.length > 0) {
                showMessage("You are at the end.");
                setTimeout(hideMessage, BOUNDARY_MESSAGE_TIMEOUT);
            }
        }
        function prevPage() {
            if (imageBlobs.length > 0 && currentImageIndex > 0) {
                displayPage(currentImageIndex - 1);
            } else if (imageBlobs.length > 0) {
                showMessage("You are at the beginning.");
                setTimeout(hideMessage, BOUNDARY_MESSAGE_TIMEOUT);
            }
        }
        function applyMangaMode() { 
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
        function showHUD() { 
            if (!hudOverlay || !imageContainer) return;
            clearTimeout(hudTimer);
            hudOverlay.classList.add('visible');
            imageContainer.style.paddingTop = HUD_TOP_BAR_HEIGHT;
            hudTimer = setTimeout(hideHUD, 4000);
        }
        function hideHUD(delay = 4000) { 
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
        function toggleHUD() { (hudOverlay && hudOverlay.classList.contains('visible')) ? hideHUD(0) : showHUD(); }
        function showMenuPanel() { if (menuPanel) menuPanel.classList.add('visible'); hideHUD(0); }
        function hideMenuPanel() { if (menuPanel) menuPanel.classList.remove('visible'); }
        function applyFitMode(modeValue) { 
            if (!comicImage || !imageContainer) return;
            fitMode = modeValue;
            comicImage.style.width = 'auto'; comicImage.style.height = 'auto';
            comicImage.style.maxWidth = 'none'; comicImage.style.maxHeight = 'none';
            if (!comicImage.naturalWidth || comicImage.naturalWidth === 0) {
                if (!comicImage.complete && comicImage.src && !comicImage.src.startsWith("file:")) { 
                    comicImage.addEventListener('load', () => applyFitMode(modeValue), { once: true });
                }
                return;
            }
            switch (fitMode) {
                case 'best': comicImage.style.maxWidth = '100%'; comicImage.style.maxHeight = '100%'; break;
                case 'width': comicImage.style.width = '100%'; comicImage.style.height = 'auto'; break; 
                case 'height': comicImage.style.height = `${imageContainer.clientHeight}px`; comicImage.style.width = 'auto'; break; 
                case 'original': comicImage.style.width = `${comicImage.naturalWidth}px`; comicImage.style.height = `${comicImage.naturalHeight}px`; break;
            }
            if (fitLabels) fitLabels.forEach(label => {
                const radio = label.querySelector('input');
                if (radio) { label.classList.toggle('checked', radio.value === fitMode); radio.checked = radio.value === fitMode; }
            });
        }
        function changeZoom(factor) { 
             if (!comicImage) return;
            const currentWidth = comicImage.clientWidth;
            comicImage.style.width = `${currentWidth * factor}px`;
            comicImage.style.height = 'auto';
            comicImage.style.maxWidth = 'none'; comicImage.style.maxHeight = 'none';
            fitMode = 'manual';
            if (fitLabels) fitLabels.forEach(label => {
                label.classList.remove('checked');
                const radio = label.querySelector('input'); if (radio) radio.checked = false;
            });
        }
        function updateUI() { 
            if (pageIndicatorHud) pageIndicatorHud.textContent = imageBlobs.length > 0 ? `${currentImageIndex + 1} / ${imageBlobs.length}` : `0 / 0`;
        }

        // Event Listeners for index.html
        if (selectFileButton && fileInput) {
            selectFileButton.addEventListener('click', () => { console.log("selectFileButton clicked"); fileInput.click(); });
        }
        if (uploadButtonHeader && fileInput) {
            uploadButtonHeader.addEventListener('click', () => { console.log("uploadButtonHeader clicked"); fileInput.click(); });
        }
        if (uploadButtonHeaderMobile && fileInput) {
            uploadButtonHeaderMobile.addEventListener('click', () => {
                console.log("uploadButtonHeaderMobile clicked");
                // This relies on globalHamburgerButton and globalMobileMenu from global-ui.js
                if (document.getElementById('mobileMenu') && document.getElementById('mobileMenu').classList.contains('open') && document.getElementById('hamburgerButton')) {
                    document.getElementById('mobileMenu').classList.remove('open');
                    document.getElementById('hamburgerButton').setAttribute('aria-expanded', 'false');
                    document.getElementById('hamburgerButton').innerHTML = `<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>`;
                }
                fileInput.click();
            });
        }
        if (fileInput) {
            fileInput.addEventListener('change', (e) => { 
                if (e.target.files && e.target.files.length > 0) { handleFile(e.target.files[0]); e.target.value = ''; } 
            });
        }
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragging'); });
            dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('dragging'); });
            dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragging'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
        }
        if (imageContainer) { 
            imageContainer.addEventListener('click', (event) => {
                if (menuPanel && menuPanel.classList.contains('visible')) return;
                const scrollbarWidth = 17; 
                if (event.offsetX >= imageContainer.clientWidth - scrollbarWidth || event.offsetY >= imageContainer.clientHeight - scrollbarWidth) return;
                if (hudOverlay && hudOverlay.classList.contains('visible') && event.target.closest('.hud-icon')) {
                    showHUD(); return; 
                }
                const rect = imageContainer.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const containerWidth = imageContainer.clientWidth;
                if (x < containerWidth * 0.25) { isMangaModeActive ? nextPage() : prevPage(); }
                else if (x > containerWidth * 0.75) { isMangaModeActive ? prevPage() : nextPage(); }
                else { toggleHUD(); }
            }); 
        }
        if (hudOverlay) {
            hudOverlay.addEventListener('click', (event) => {
                if (hudOverlay.classList.contains('visible') && event.target === hudOverlay) {
                    hideHUD(0); 
                    event.stopPropagation(); 
                } else if (hudOverlay.classList.contains('visible') && event.target.closest('.hud-icon')) {
                    showHUD(); 
                }
            });
        }
        if (backButton) { 
            backButton.addEventListener('click', () => {
                showView('upload');
                imageBlobs = []; originalImageBlobs = []; currentImageIndex = 0;
                if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null; }
                if (previousObjectUrl) { URL.revokeObjectURL(previousObjectUrl); previousObjectUrl = null; }
                if (comicImage) { comicImage.onerror = null; comicImage.src = ""; }
                updateUI();
                if (menuPanel) menuPanel.classList.remove('visible');
                hideMessage();
                document.body.style.overflow = ''; 
            }); 
        }
        if (menuButton) menuButton.addEventListener('click', showMenuPanel);
        if (closeMenuButton) closeMenuButton.addEventListener('click', hideMenuPanel);
        if (mangaModeToggle) mangaModeToggle.addEventListener('change', applyMangaMode);
        if (zoomInButtonPanel) zoomInButtonPanel.addEventListener('click', () => changeZoom(ZOOM_STEP));
        if (zoomOutButtonPanel) zoomOutButtonPanel.addEventListener('click', () => changeZoom(1 / ZOOM_STEP));
        if (fitLabels) { fitLabels.forEach(label => { const radio = label.querySelector('input'); if (radio) label.addEventListener('click', () => applyFitMode(radio.value));});}
        document.addEventListener('keydown', (e) => { 
             if (views.reader && views.reader.classList.contains('active')) {
                if (menuPanel && menuPanel.classList.contains('visible')) {
                    if (e.key === 'Escape') hideMenuPanel(); return;
                }
                let handled = false;
                if (e.key === 'ArrowLeft') { isMangaModeActive ? nextPage() : prevPage(); handled = true; }
                else if (e.key === 'ArrowRight') { isMangaModeActive ? prevPage() : nextPage(); handled = true; }
                else if (e.key === ' ') { toggleHUD(); handled = true; e.preventDefault(); }
                else if (e.key === '+' || e.key === '=') { changeZoom(ZOOM_STEP); handled = true; }
                else if (e.key === '-') { changeZoom(1 / ZOOM_STEP); handled = true; }
                else if (e.key.toLowerCase() === 'm') { if(mangaModeToggle) {mangaModeToggle.checked = !mangaModeToggle.checked; applyMangaMode();} handled = true; }
                if (handled) e.preventDefault();
            }
        });
        
        showView('upload');
        if(mangaModeToggle) isMangaModeActive = mangaModeToggle.checked;
        applyFitMode('best');

        console.log("Index.html specific logic: Initialization COMPLETE.");
    } else {
        console.log("Not on index.html (or core elements 'uploadView'/'readerView' missing), skipping reader initialization.");
        document.body.style.overflow = ''; 
    }
});