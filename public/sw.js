const CACHE_NAME = 'carevity-v1';

// Static assets that make up the app shell
const STATIC_ASSETS = [
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json',
];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip non-http(s) protocols
  if (!url.protocol.startsWith('http')) return;

  // Skip Supabase API — always network, never cache auth/data calls
  if (url.hostname.includes('supabase.co')) return;

  // Skip Next.js HMR and internal requests
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;
  if (url.pathname.startsWith('/__nextjs')) return;

  // ── Next.js static bundles (content-hashed) — cache-first ──────────────────
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── Icons, manifest — cache-first ──────────────────────────────────────────
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.ico'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── Navigation (HTML pages) — network-first, offline fallback ──────────────
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful HTML responses for offline fallback
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || caches.match('/offline.html')
          )
        )
    );
    return;
  }

  // ── Everything else — network-first ────────────────────────────────────────
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
