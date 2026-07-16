/* Appro — Service Worker
   App-shell caching: precache the core UI files (never the apk/games
   folders — those are fetched live and cached on demand instead, so a
   new file you add shows up immediately without a stale cache). */

const CACHE_NAME = 'appro-cache-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './css/styles.css',
  './js/data.js',
  './js/app.js',
  './js/apk-icon.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Catalog JSON and files in apk/ or games/ should always hit the network
  // first, so new additions show up without needing a cache-bust.
  if (/\/(apk|games)\//.test(request.url)) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => { const clone = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(request, clone)); return res; })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./offline.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match('./offline.html'));
    })
  );
});
