// PharMinds Algeria — Service Worker v3
// Strategy:
//   - HTML/navigation:        NETWORK-FIRST  (always fresh, fallback to cache when offline)
//   - Hashed assets (/assets/): CACHE-FIRST   (immutable filenames change per deploy)
//   - Supabase / API:         NETWORK-ONLY   (never cache auth-bearing requests)

const CACHE_NAME = 'pharminds-v3';

// Install: take over immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: nuke ALL old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1. NEVER cache cross-origin or auth-bearing API calls
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/functions/') ||
    url.hostname.includes('supabase') ||
    url.pathname.startsWith('/arcee-api') ||
    url.pathname.startsWith('/ocr-api')
  ) {
    return; // let browser handle natively
  }

  // 2. HTML / navigation: network-first
  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('/')))
    );
    return;
  }

  // 3. Hashed assets: cache-first (filenames are content-hashed)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok && res.type === 'basic') {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // 4. Everything else (favicon, manifest, etc.): stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// Force-refresh hook: page can post a message to skip waiting
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
