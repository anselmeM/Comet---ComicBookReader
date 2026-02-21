// --- Configuration ---
const CACHE_NAME = 'comet-reader-cache-v6'; // Cache name UPDATED
const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
// const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?display=swap&family=Manrope%3Awght%40400%3B500%3B700%3B800&family=Noto+Sans%3Awght%40400%3B500%3B700%3B900'; // Removed

// List of files that constitute your "App Shell" - must be available offline.
const urlsToCache = [
  './', // Cache the root directory (often serves index.html)
  './index.html',
  './features.html',
  './pricing.html',
  './support.html',
  './terms.html',
  './privacy.html',
  './css/global.css', // Corrected CSS path
  './css/static-pages.css', // Corrected CSS path
  './css/dark-theme.css', // Corrected CSS path
  './css/index-specific.css', // Corrected CSS path
  './js/global-ui.js',
  './js/pwa-init.js',
  './js/comet-reader.js',
  './offline.html',
  JSZIP_URL,
  // GOOGLE_FONTS_URL, // Removed as recommended
  './manifest.json',
  // All necessary icons from your icons folder:
  './icons/android-chrome-192x192.png',
  './icons/android-chrome-512x512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32x32.png',
  './icons/favicon-16x16.png',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-384x384.png'
];

// --- Installation Event ---
self.addEventListener('install', event => {
  console.log(`[Service Worker] Installing v${CACHE_NAME}...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching App Shell...');
        const requests = urlsToCache.map(url => {
            if (url.startsWith('http')) { // For external URLs like CDNs
                return new Request(url, { mode: 'cors' });
            }
            return new Request(url); // For local assets
        });
        return cache.addAll(requests);
      })
      .then(() => {
        console.log('[Service Worker] Installation successful. Activating immediately.');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Caching failed during install:', error);
      })
  );
});

// --- Activation Event ---
self.addEventListener('activate', event => {
  console.log(`[Service Worker] Activating v${CACHE_NAME}...`);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[Service Worker] Old caches cleaned up. Claiming clients...');
        return self.clients.claim();
    })
  );
});

// --- Fetch Event ---
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
            return networkResponse;
        }).catch(error => {
            console.warn('[Service Worker] Fetch failed for:', event.request.url, error);
            if (event.request.mode === 'navigate') {
              return caches.match('./offline.html');
            }
        });
      })
  );
});