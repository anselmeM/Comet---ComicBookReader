// pwa-init.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("PWA Initializer Script Initializing...");

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
});