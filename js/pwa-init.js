// pwa-init.js

let deferredPrompt;

document.addEventListener('DOMContentLoaded', () => {
    console.log("PWA Initializer Script Initializing...");

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => { // Wait for page to load before registering SW
            if (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => console.log('PWA Init: Service Worker registered successfully, scope:', reg.scope))
                    .catch(err => console.error('PWA Init: Service Worker registration failed:', err));
            } else {
                console.warn('PWA Init: Service Worker registration skipped (not HTTPS or localhost).');
            }
        });
    } else {
        console.log('PWA Init: Service Worker not supported in this browser.');
    }

    // Install Prompt Handling
    const installBtns = document.querySelectorAll('#installAppBtn');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI notify the user they can install the PWA
        installBtns.forEach(btn => btn.style.display = 'flex');
        console.log('PWA Init: beforeinstallprompt fired, install button shown.');
    });

    installBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            // Hide the app provided install promotion
            installBtns.forEach(b => b.style.display = 'none');
            // Show the install prompt
            if (deferredPrompt) {
                deferredPrompt.prompt();
                // Wait for the user to respond to the prompt
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`PWA Init: User response to install prompt: ${outcome}`);
                // We've used the prompt, and can't use it again, throw it away
                deferredPrompt = null;
            }
        });
    });

    window.addEventListener('appinstalled', () => {
        // Hide the app-provided install promotion
        installBtns.forEach(b => b.style.display = 'none');
        // Clear the deferredPrompt so it can be garbage collected
        deferredPrompt = null;
        console.log('PWA Init: PWA was installed');
    });
});
