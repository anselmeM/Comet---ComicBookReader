// global-ui.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("Global UI Script Initializing...");

    // --- Generic Mobile Menu Toggle ---
    const globalHamburgerButton = document.getElementById('hamburgerButton');
    const globalMobileMenu = document.getElementById('mobileMenu');

    if (globalHamburgerButton && globalMobileMenu) {
        console.log("Global UI: Mobile menu elements found, attaching handlers.");
        globalHamburgerButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = globalMobileMenu.classList.toggle('open');
            globalHamburgerButton.setAttribute('aria-expanded', isOpen.toString());
            if (isOpen) {
                globalHamburgerButton.innerHTML = `<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
            } else {
                globalHamburgerButton.innerHTML = `<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>`;
            }
        });

        document.addEventListener('click', (e) => {
            if (globalMobileMenu.classList.contains('open') && !globalMobileMenu.contains(e.target) && !globalHamburgerButton.contains(e.target)) {
                globalMobileMenu.classList.remove('open');
                if (globalHamburgerButton) {
                    globalHamburgerButton.setAttribute('aria-expanded', 'false');
                    globalHamburgerButton.innerHTML = `<svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>`;
                }
            }
        });
    } else {
        // console.log("Global UI: Mobile menu elements (#hamburgerButton or #mobileMenu) not found.");
    }

    // --- Theme Toggle Logic ---
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIconMoon = document.getElementById('themeIconMoon');
    const themeIconSun = document.getElementById('themeIconSun');
    const htmlElement = document.documentElement;

    function applyTheme(theme) { // Renamed to avoid potential global scope issues if other scripts use same name
        if (!htmlElement) return;
        if (theme === 'dark') {
            htmlElement.classList.add('dark');
            if(themeIconMoon) themeIconMoon.classList.add('hidden');
            if(themeIconSun) themeIconSun.classList.remove('hidden');
        } else {
            htmlElement.classList.remove('dark');
            if(themeIconSun) themeIconSun.classList.add('hidden');
            if(themeIconMoon) themeIconMoon.classList.remove('hidden');
        }
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            themeColorMeta.setAttribute('content', theme === 'dark' ? '#0D141C' : '#ffffff');
        }
    }

    if (themeToggleBtn && htmlElement) {
        console.log("Global UI: Theme toggle button found, initializing.");
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) { applyTheme(savedTheme); }
        else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) { applyTheme('dark'); }
        else { applyTheme('light'); }

        themeToggleBtn.addEventListener('click', () => {
            const isDark = htmlElement.classList.toggle('dark');
            const newTheme = isDark ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
            console.log("Global UI: Theme toggled to:", newTheme);
        });
    } else {
        // console.log("Global UI: Theme toggle button (#themeToggleBtn) not found.");
    }
});