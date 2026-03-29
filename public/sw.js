// Khatupati PWA Service Worker - Full Offline Cache-First Strategy
const CACHE_NAME = 'khatupati-v6';
const STATIC_CACHE = 'khatupati-static-v6';
const DYNAMIC_CACHE = 'khatupati-dynamic-v6';

// Critical app shell pages to pre-cache on install
const APP_SHELL = [
  '/',
  '/login',
  '/offline',
  '/purchases',
  '/lots/new',
  '/jobs',
  '/production-map',
  '/reports',
  '/cashflow',
  '/briefing',
  '/trends',
  '/forecast',
  '/settings/storage',
  '/settings/vendors',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ── Install: pre-cache the whole app shell ─────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing - caching app shell');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      for (const url of APP_SHELL) {
        try {
          await cache.add(url);
          console.log(`[SW] Cached: ${url}`);
        } catch (e) {
          console.warn(`[SW] Failed to cache: ${url}`, e.message);
        }
      }
    })
  );
  self.skipWaiting();
});

// ── Activate: clear old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating - clearing old caches');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Cache-First for assets, Network-First for navigation ────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip non-http requests (chrome-extension:// etc)
  if (!url.protocol.startsWith('http')) return;

  // Skip Google Fonts and external requests - serve cached or skip
  if (!url.origin.includes('localhost') && !url.origin.includes('127.0.0.1')) {
    // For external requests (fonts etc), try cache then network, never fail
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((res) => {
            if (res && res.status === 200) {
              const clone = res.clone();
              caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
            }
            return res;
          })
          .catch(() => new Response('', { status: 200 }));
      })
    );
    return;
  }

  // For Next.js JS/CSS chunks → Cache-First (they are hashed, safe to cache forever)
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff|woff2|ttf)$/);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // For page navigations & API routes → Network-First with cache fallback
  event.respondWith(
    fetch(request)
      .then((res) => {
        // Cache successful responses for later offline use
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() => {
        // Network failed → serve from cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // Final fallback for navigation
          if (request.mode === 'navigate') {
            return caches.match('/').then((r) => r || caches.match('/offline'));
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
