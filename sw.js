'use strict';
// Deployment replaces the development cache name with a content hash.
const CACHE = 'randomisera-offline-development';
const FILES = ["./","slumpa-nummer/","dela-in-i-grupper/","slumpa-lista/","singla-slant/","lagring-och-integritet/","assets/style.css","assets/app.js","assets/pwa.js","assets/saved-lists.js","manifest.webmanifest","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/icons/apple-touch-icon.png","assets/icons/favicon.ico"];
const urls = FILES.map(file => new URL(file, self.registration.scope).href);
async function ready() {
  if (!(await caches.keys()).includes(CACHE)) return false;
  const cache = await caches.open(CACHE);
  return (await Promise.all(urls.map(url => cache.match(url)))).every(Boolean);
}
async function prepare() {
  if (await ready()) return;
  const cache = await caches.open(CACHE);
  await cache.addAll(urls.map(url => new Request(url, {cache:'reload'})));
}
self.addEventListener('install', event => event.waitUntil(prepare()));
// Never interrupt an active draw with skipWaiting(). A complete release waits
// until windows controlled by the previous worker have closed.
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) {
    if (key.startsWith('randomisera-offline-') && key !== CACHE) await caches.delete(key);
  }
  await self.clients.claim();
})()));
self.addEventListener('message', event => {
  if (!event.ports[0] || !['OFFLINE_STATUS','PREPARE_OFFLINE'].includes(event.data?.type)) return;
  event.waitUntil((async () => {
    try {
      if (event.data.type === 'PREPARE_OFFLINE') await prepare();
      event.ports[0].postMessage({ready:await ready()});
    } catch { event.ports[0].postMessage({ready:false}); }
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  url.search = '';
  if (url.pathname.endsWith('/index.html')) url.pathname = url.pathname.slice(0,-10);
  if (!urls.includes(url.href)) return;
  event.respondWith((async () => {
    // Serve this worker's release immediately, without waiting for the network.
    const cache = await caches.open(CACHE);
    const response = await cache.match(url.href);
    if (response) return response;
    // Storage may have been evicted. Recover online without mixing new assets
    // into the existing release cache; preparation can rebuild it separately.
    try { return await fetch(event.request); }
    catch { return new Response('Offlinefilerna saknas. Anslut till internet och öppna Randomisera igen.', {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}); }
  })());
});
