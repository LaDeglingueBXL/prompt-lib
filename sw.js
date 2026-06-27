/* ============================================================
   Service worker — prompt-lib
   Precache app shell. network-first pour data.json + CDN.
   ============================================================ */
const CACHE = "biblio-prompts-v2";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/app.js",
  "./js/db.js",
  "./js/search.js",
  "./js/util.js",
  "./js/modal.js",
  "./js/generator.js",
  "./js/importer.js",
  "./js/exporter.js",
  "./assets/icons/icon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

// install: precache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// activate: drop old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// fetch
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Laisser passer les requêtes externes (jsDelivr, CDN) sans interférer
  if (!request.url.startsWith(self.location.origin)) return;

  const url = new URL(request.url);
  const isShell = SHELL.some((p) => url.pathname.endsWith(p.replace("./", "/")));

  if (isShell) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request))
    );
    return;
  }

  // network-first, fall back to cache (data.json + thumbs)
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request))
  );
});