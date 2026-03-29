// Khatupati PWA Service Worker - Advanced Offline & Cache Strategy
const CACHE_NAME = 'khatupati-v4';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/login',
  '/offline',
  '/manifest.json',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  addLog('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache assets one by one to avoid entire failure if one is missing
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
          addLog(`Cached asset: ${asset}`);
        } catch (e) {
          console.warn(`Failed to cache asset: ${asset}`, e);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  addLog('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and same-origin requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    // 1. Try network first
    fetch(event.request)
      .then((response) => {
        // 2. If valid response, clone and cache it
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 3. Fallback to cache if network fails
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          
          // 4. Special fallback for navigation (pages)
          if (event.request.mode === 'navigate') {
            return caches.match('/offline');
          }
          
          return new Response('Offline content not available', { 
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});

function addLog(msg) {
  console.log(`[PWA-SW] ${msg}`);
}
