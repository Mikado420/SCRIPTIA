// Service Worker for TCG Simulator PWA
const CACHE_VERSION = 'v2.3.3';
const STATIC_CACHE_NAME = `tcg-static-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `tcg-runtime-${CACHE_VERSION}`;

// Core assets to pre-cache
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Pre-caching some assets failed:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('tcg-') && name !== STATIC_CACHE_NAME && name !== RUNTIME_CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting legacy cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cross-origin requests (e.g. Cloudflare Worker APIs or WebSockets) must NEVER be intercepted by SW
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip local API or non-GET requests
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-first for navigation (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => cached || caches.match('./index.html') || caches.match('./'));
        })
    );
    return;
  }

  // Stale-while-revalidate for local static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
