const CACHE_NAME = 'gestilys-shell-v2';
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

  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'image' || request.destination === 'font' || url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const update = fetch(request).then(async (response) => {
        if (response && response.ok) await cache.put(request, response.clone());
        return response;
      });
      if (cached) {
        event.waitUntil(update.then(() => undefined).catch(() => undefined));
        return cached;
      }
      try {
        return await update;
      } catch {
        return new Response('', { status: 503, statusText: 'Offline' });
      }
    })());
  }
});
