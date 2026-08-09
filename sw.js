// Mistex service worker — lets the app open with zero connectivity,
// instead of the browser just failing outright with nothing to show.
//
// Deliberately NETWORK-FIRST, not cache-first: always try the real
// network first, only fall back to a cached copy if that fails. Online,
// you always get the latest version; the cached copy is only ever used
// when the network genuinely isn't there. Same design as Kardex and
// Practex's service workers, for the same reason — a cache-first worker
// risks quietly serving a stale version indefinitely.

const CACHE_NAME = 'mistex-shell-v1';
const SHELL_URLS = ['index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                  // never intercept POST/PUT/DELETE
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;    // never touch third-party domains (Supabase, fonts, etc.)
  if (url.pathname.startsWith('/api/')) return;       // never touch any backend calls

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          if (req.mode === 'navigate') return caches.match('index.html');
          return new Response('', { status: 504 });
        })
      )
  );
});
