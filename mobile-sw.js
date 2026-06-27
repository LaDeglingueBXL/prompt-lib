/* mobile-sw.js — service worker PWA mobile */

const CACHE   = 'mob-v1';
const SHELL   = [
  '/mobile.html',
  '/css/mobile.css',
  '/js/mobile.js',
  '/mobile-manifest.json',
];

// Install : precache shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL))
  );
  self.skipWaiting();
});

// Activate : purge anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // data.json et thumbs : network-first (fraîcheur), fallback cache
  if (url.includes('jsdelivr.net') || url.includes('/assets/thumbs/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Shell : cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
