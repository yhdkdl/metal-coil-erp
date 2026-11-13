// Service Worker for Metal Coil ERP PWA - Version 3.0
const CACHE_NAME = 'metal-coil-erp-v3';

// Only cache immutable static icons and assets, NEVER HTML pages or API responses
const IMMUTABLE_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon.svg',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  // Force active immediately on install
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(IMMUTABLE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Clean up all old caches immediately
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. NEVER cache API requests - always live from backend
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 2. HTML Page Navigations: ALWAYS fetch from network with no-cache so latest deploy is seen!
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // 3. Static assets: Network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, toCache);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
