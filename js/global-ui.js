// global-ui.js - V2 (Clean Rewrite)

document.addEventListener('DOMContentLoaded', () => {
    console.log("Global UI: Initializing...");

    // --- Cache DOM Elements ---
    const hamburgerButton = document.getElementById('hamburgerButton');
    const mobileMenu = document.getElementById('mobileMenu');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIconMoon = document.getElementById('themeIconMoon');
    const themeIconSun = document.getElementById('themeIconSun');
    const installButton = document.getElementById('installAppBtn'); // PWA Install Button ID
    const htmlElement = document.documentElement;
    let deferredPrompt; // Stores the PWA prompt event

    // --- Mobile Menu Logic ---
    function setupMobileMenu() {
        if (!hamburgerButton || !mobileMenu) {
            console.warn("Global UI: Mobile menu elements (#hamburgerButton or #mobileMenu) not found.");
            return;
        }
        console.log("Global UI: Setting up mobile menu.");

        const openIconSVG = `<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>`;
        const closeIconSVG = `<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;

        hamburgerButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click-outside from closing it immediately
            const isOpen = mobileMenu.classList.toggle('open');
            hamburgerButton.setAttribute('aria-expanded', isOpen.toString());
            hamburgerButton.innerHTML = isOpen ? closeIconSVG : openIconSVG;
        });

        // Click outside to close menu
        document.addEventListener('click', (e) => {
            if (mobileMenu.classList.contains('open') && !mobileMenu.contains(e.target) && !hamburgerButton.contains(e.target)) {
                mobileMenu.classList.remove('open');
                hamburgerButton.setAttribute('aria-expanded', 'false');
                hamburgerButton.innerHTML = openIconSVG;
            }
        });
    }

    // --- Theme Toggle Logic ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            htmlElement.classList.add('dark');
            if (themeIconMoon) themeIconMoon.classList.add('hidden');
            if (themeIconSun) themeIconSun.classList.remove('hidden');
        } else {
            htmlElement.classList.remove('dark');
            if (themeIconSun) themeIconSun.classList.add('hidden');
            if (themeIconMoon) themeIconMoon.classList.remove('hidden');
        }
        // Update meta theme-color (important for PWA theming)
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            themeColorMeta.setAttribute('content', theme === 'dark' ? '#0D141C' : '#ffffff');
        }
    }

    function setupThemeToggle() {
        if (!themeToggleBtn || !themeIconMoon || !themeIconSun) {
            console.warn("Global UI: Theme toggle elements not found.");
            return;
        }
        console.log("Global UI: Setting up theme toggle.");

        // Determine and apply initial theme
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme ? savedTheme : (prefersDark ? 'dark' : 'light');
        applyTheme(initialTheme);

        // Add click listener to toggle theme
        themeToggleBtn.addEventListener('click', () => {
            const isDark = htmlElement.classList.toggle('dark');
            const newTheme = isDark ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme); // Re-apply to update icons & meta
            console.log("Global UI: Theme toggled to:", newTheme);
        });
    }

    // --- PWA Install Prompt Logic ---
    function setupPWAInstall() {
        console.log("Global UI: Setting up PWA Install handler.");

        window.addEventListener('beforeinstallprompt', (e) => {
            console.log("Global UI: 'beforeinstallprompt' event fired.");
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            deferredPrompt = e;
            // Update UI notify the user they can install the PWA
            if (installButton) {
                installButton.style.display = 'flex'; // Or 'block', match your CSS
                console.log("Global UI: PWA Install button shown.");
            } else {
                 console.warn("Global UI: PWA Install button (#installAppBtn) not found, cannot show prompt button.");
            }
        });

        if (installButton) {
            installButton.addEventListener('click', async () => {
                console.log("Global UI: Install button clicked.");
                if (deferredPrompt) {
                    // Hide our user interface that shows our A2HS button
                    installButton.style.display = 'none';
                    // Show the prompt
                    deferredPrompt.prompt();
                    // Wait for the user to respond to the prompt
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(`Global UI: User response to install prompt: ${outcome}`);
                    // We can't use it again, clear it
                    deferredPrompt = null;
                } else {
                     console.log("Global UI: deferredPrompt not available or already used.");
                }
            });
        }

        window.addEventListener('appinstalled', () => {
             console.log('Global UI: PWA was installed');
             // Optionally hide the install button or show a 'thanks' message
             if(installButton) installButton.style.display = 'none';
             deferredPrompt = null;
        });
    }

    // --- Initialize All UI Components ---
    setupMobileMenu();
    setupThemeToggle();
    setupPWAInstall();

    console.log("Global UI: Initialization complete.");
});