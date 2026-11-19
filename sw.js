/* FUTURES LAB v6.4 — online-first documents, offline fallback. */
const CACHE = 'futures-lab-v6-4-stable';
const ASSETS = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Fetch this release's assets from the server, rather than a previous browser cache.
    await Promise.all(ASSETS.map(async path => {
      const response = await fetch(new Request(path, {cache:'reload'}));
      if (response.ok) await c.put(path, response);
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('futures-lab-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method !== 'GET') return;
  const url=new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req, {cache:'no-store'});
        if(res.ok) {
          const cache=await caches.open(CACHE);
          await cache.put('./index.html',res.clone());
        }
        return res;
      } catch (_) {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  if(url.pathname.endsWith('/manifest.webmanifest')) {
    event.respondWith(fetch(req, {cache:'no-store'}).catch(() => caches.match(req)));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
