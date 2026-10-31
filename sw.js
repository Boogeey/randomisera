'use strict';
// Change this version when publishing changes to cached files.
const CACHE = 'randomisera-offline-v5';
const FILES = ['./','slumpa-nummer/','dela-in-i-grupper/','slumpa-lista/','singla-slant/','lagring-och-integritet/','assets/style.css','assets/app.js','assets/pwa.js','assets/saved-lists.js','manifest.webmanifest','assets/icons/icon-192.png','assets/icons/icon-512.png','assets/icons/icon-maskable-512.png','assets/icons/apple-touch-icon.png','assets/icons/favicon.ico'];
const urls = FILES.map(file=>new URL(file,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(urls.map(url=>new Request(url,{cache:'reload'})));})()));
// Do not replace an active worker mid-session; new versions activate after old tabs close.
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('randomisera-offline-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);url.search='';
  if(url.pathname.endsWith('/index.html'))url.pathname=url.pathname.slice(0,-10);
  if(!urls.includes(url.href))return;
  event.respondWith((async()=>{
    try{const response=await fetch(event.request);if(!response.ok)throw Error('http');return response;}
    catch{const cache=await caches.open(CACHE);return await cache.match(url.href)||Response.error();}
  })());
});
