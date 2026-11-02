'use strict';
// Deployment replaces the development cache name with a content hash.
const CACHE = 'randomisera-offline-development';
// Build injects the SHA-256 integrity of every final published file.
const INTEGRITY = {};
const FILES = ["./","slumpa-nummer/","dela-in-i-grupper/","slumpa-lista/","singla-slant/","ja-eller-nej/","kasta-tarning/","lagring-och-integritet/","app/","assets/style.css","assets/fonts/inter-latin-variable.woff2","assets/fonts/inter-latin-ext-variable.woff2","assets/fonts/OFL-Inter.txt","assets/app.js","assets/pwa.js","manifest.webmanifest","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/icons/apple-touch-icon.png","assets/icons/favicon.ico"];
const urls = FILES.map(file => new URL(file, self.registration.scope).href);
function releaseRequest(url) {
  const integrity = INTEGRITY[FILES[urls.indexOf(url)]];
  if (!integrity && CACHE !== 'randomisera-offline-development') throw Error('Missing release integrity');
  return new Request(url, {cache:'reload', credentials:'same-origin', ...(integrity ? {integrity} : {})});
}
async function ready() {
  if (!(await caches.keys()).includes(CACHE)) return false;
  const cache = await caches.open(CACHE);
  return (await Promise.all(urls.map(url => cache.match(url)))).every(Boolean);
}
async function prepare() {
  const cache = await caches.open(CACHE);
  const missing = [];
  for (const url of urls) if (!await cache.match(url)) missing.push(releaseRequest(url));
  // addAll commits this batch only if every response succeeds and passes SRI.
  // Never replace a valid old entry with the latest file at the same URL.
  if (missing.length) await cache.addAll(missing);
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
      event.ports[0].postMessage({ready:await ready(), version:CACHE});
    } catch { event.ports[0].postMessage({ready:false, version:CACHE}); }
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
    // Only the exact file from this release may satisfy a missing cache entry.
    // If the server now hosts another release, fail closed instead of mixing it.
    try {
      const response = await fetch(releaseRequest(url.href));
      if (!response.ok) throw Error('Missing release file');
      return response;
    } catch {
      return new Response('Offlinefilerna behöver uppdateras. Anslut till internet, stäng alla Randomisera-fönster och öppna appen igen. Sparade listor finns kvar.', {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});
