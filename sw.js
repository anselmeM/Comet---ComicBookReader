// --- Configuration ---
const CACHE_NAME = 'comet-reader-cache-v3'; // IMPORTANT: Increment this version number when you update files!
const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?display=swap&family=Manrope%3Awght%40400%3B500%3B700%3B800&family=Noto+Sans%3Awght%40400%3B500%3B700%3B900';

// List of files that constitute your "App Shell" - must be available offline.
const urlsToCache = [
  '/', // The root path, often serves index.html
  'index.html',
  // 'script.js', // Only if it becomes external
  // 'style.css', // Only if it becomes external
  JSZIP_URL,
  GOOGLE_FONTS_URL,
  'manifest.json',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
  // Add other essential icons or assets here
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
        const requests = urlsToCache.map(url => new Request(url, { mode: 'cors' }));
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

  // Use a "Cache First, then Network" strategy.
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
            // IMPORTANT: We are NOT caching network responses here by default.
            // This prevents caching *everything* (like API calls or user data).
            // We only cache the app shell during install.
            // If you *did* want to cache dynamic content, you would add:
            // caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
            return networkResponse;
        }).catch(error => {
            // If both cache and network fail (e.g., offline & not cached),
            // you could return a custom offline fallback page/image here.
            console.warn('[Service Worker] Fetch failed; returning offline fallback or error.', error);
            // Example: return caches.match('/offline.html');
        });
      })
  );
});