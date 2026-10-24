const CACHE_NAME = 'gestilys-shell-v7';
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
    // Also cache the current Vite HTML shell and its hashed JS/CSS files.
    // These are required for the installed PWA to start after the network disappears.
    try {
      const response = await fetch('/', { cache: 'reload' });
      if (response.ok) {
        const html = await response.clone().text();
        await cache.put('/', response.clone());
        const assets = [...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g)]
          .map((match) => new URL(match[1], self.location.origin).href);
        await Promise.all(assets.map(async (assetUrl) => {
          try {
            const assetResponse = await fetch(assetUrl);
            if (assetResponse.ok) await cache.put(assetUrl, assetResponse);
          } catch {
            // Keep installation successful if one optional asset cannot be fetched.
          }
        }));
      }
    } catch {
      // The shell URLs above remain the minimum offline fallback.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('gestilys-shell-') && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (/\/(rest\/v1|auth\/v1|storage\/v1|functions\/v1)(\/|$)/.test(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/', response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) || (await cache.match('/')) || (await cache.match('/offline.html'));
      }
    })());
    return;
  }

  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'image' || request.destination === 'font' || request.destination === 'document' || url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      // Network-first: never show an old app bundle when a newer deployment is online.
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response && response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        return new Response('', { status: 503, statusText: 'Offline' });
      }
    })());
  }
});
