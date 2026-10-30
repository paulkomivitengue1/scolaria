const CACHE_NAME = 'gestilys-shell-v9';
const SHELL_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/app-icon.svg',
  '/app-icon-maskable.svg',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL_URLS);
    // Pre-cache the exact hashed bundles referenced by the current HTML.
    // A PWA must never combine an old HTML shell with missing/stale JS chunks.
    try {
      const response = await fetch('/', { cache: 'reload' });
      if (response.ok) {
        const html = await response.clone().text();
        await cache.put('/', response.clone());
        const assets = [...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g)]
          .map((match) => new URL(match[1], self.location.origin).href);
        await Promise.all(assets.map(async (assetUrl) => {
          try {
            const assetResponse = await fetch(assetUrl, { cache: 'reload' });
            if (assetResponse.ok) await cache.put(assetUrl, assetResponse);
          } catch {
            // A single optional asset must not prevent the worker from installing.
          }
        }));
      }
    } catch {
      // Keep the minimum shell cache if the network is temporarily unavailable.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith('gestilys-shell-') && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache authentication, database, storage or edge-function responses.
  if (/\/(rest\/v1|auth\/v1|storage\/v1|functions\/v1)(\/|$)/.test(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response && response.ok) await cache.put('/', response.clone());
        return response;
      } catch {
        return (await cache.match(request)) ||
          (await cache.match('/')) ||
          (await cache.match('/offline.html')) ||
          Response.error();
      }
    })());
    return;
  }

  // Vite assets have content-hashed names: cache-first is safe and avoids a
  // transient mobile-network failure leaving the PWA with a blank document.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return Response.error();
      }
    })());
    return;
  }

  if (['script', 'style', 'image', 'font', 'document'].includes(request.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response && response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request)) || Response.error();
      }
    })());
  }
});
