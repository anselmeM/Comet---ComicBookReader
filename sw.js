// --- Configuration ---
const CACHE_NAME = 'comet-reader-cache-v4'; // IMPORTANT: Increment this version number when you update files!
const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?display=swap&family=Manrope%3Awght%40400%3B500%3B700%3B800&family=Noto+Sans%3Awght%40400%3B500%3B700%3B900';

// List of files that constitute your "App Shell" - must be available offline.
// Ensure all paths are relative to the location of sw.js (which should be in the root)
const urlsToCache = [
  './', // The root path, often serves index.html for PWA start
  './index.html',
  './features.html', // Added features page
  './pricing.html',  // Added pricing page
  './support.html',  // Added support page
  // External libraries
  JSZIP_URL,
  GOOGLE_FONTS_URL,
  // PWA essentials
  './manifest.json',
  // Core PWA Icons (ensure these match your manifest and icon folder)
  './icons/android-chrome-192x192.png',
  './icons/android-chrome-512x512.png', // Assuming you converted this to PNG
  './icons/apple-touch-icon.png',
  './icons/favicon-32x32.png',
  './icons/favicon-16x16.png',
  // Add ALL other PWA icon sizes listed in your manifest.json, for example:
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-maskable-192x192.png', // If you have a specific maskable version
  './icons/icon-384x384.png',
  './icons/icon-maskable-512x512.png'  // If you have a specific maskable version
  // Add any other critical assets like a logo used in multiple places if not already covered.
];

// --- Installation Event ---
self.addEventListener('install', event => {
  console.log(`[Service Worker] Installing v${CACHE_NAME}...`);
  // Perform install steps: open cache and add app shell files.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching App Shell...');
        // Create requests for all URLs, handling external ones with CORS.
        const requests = urlsToCache.map(url => {
            // For external URLs, mode: 'cors' is fine.
            // For local assets, no special mode is needed if served from the same origin.
            if (url.startsWith('http')) {
                return new Request(url, { mode: 'cors' });
            }
            return new Request(url);
        });
        // Add all requests to the cache.
        return cache.addAll(requests);
      })
      .then(() => {
        console.log('[Service Worker] Installation successful. Activating immediately.');
        // Force the waiting service worker to become the active service worker.
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
  // This event is fired when the new service worker takes control.
  // It's the perfect time to clean up old caches.
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // If a cache name exists but isn't our current one, delete it.
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[Service Worker] Old caches cleaned up. Claiming clients...');
        // Ensure the SW takes control of any open clients (pages) immediately.
        return self.clients.claim();
    })
  );
});

// --- Fetch Event ---
self.addEventListener('fetch', event => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  // Strategy: Cache First, then Network for app shell assets.
  // For other requests (e.g., API calls, non-cached images), just fetch.
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If the resource is in the cache, return it.
        if (cachedResponse) {
          // console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // If not in cache, try to fetch it from the network.
        // console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request).then(networkResponse => {
            // IMPORTANT: We are NOT caching network responses here by default for non-app-shell items.
            // This prevents caching *everything* (like API calls or user data if you add them later).
            // The app shell (urlsToCache) is explicitly cached during the 'install' event.
            return networkResponse;
        }).catch(error => {
            // If both cache and network fail (e.g., offline & not cached),
            // you could return a custom offline fallback page/image here.
            console.warn('[Service Worker] Fetch failed for:', event.request.url, error);
            // Example: return new Response("Network error occurred and resource not in cache.", { status: 404, statusText: "Not Found" });
            // Or, return a specific offline fallback page:
            // return caches.match('./offline.html'); // You'd need to create and cache an offline.html
        });
      })
  );
});
```

