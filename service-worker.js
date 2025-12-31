/* Offline-first PWA Service Worker (cache seguro) */
const CACHE_NAME = "teacher-assist-v2";
const ASSETS = [
  "./",
  "./index.html?v=2",
  "./styles.css?v=2",
  "./app.js?v=2",
  "./db.js?v=2",
  "./ai.js?v=2",
  "./manifest.webmanifest?v=2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k)))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req, { ignoreSearch: false }).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => {
          // fallback básico
          return caches.match("./index.html?v=2");
        });
    })
  );
});