/* Dachshund Feliz — service worker
   HTML: red primero (para que los cambios lleguen), caché como respaldo.
   Resto: caché primero, y se actualiza en segundo plano. */
const VERSION = 'v5';
const CACHE = 'dachshund-feliz-' + VERSION;
const SHELL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const esHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (esHTML) {
    // red primero: si hay internet, siempre la versión más nueva
    e.respondWith(
      fetch(req)
        .then(r => {
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copia));
          return r;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // resto: caché primero, revalidando por detrás
  e.respondWith(
    caches.match(req).then(cached => {
      const red = fetch(req).then(r => {
        if (r && (r.ok || r.type === 'opaque')) {
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return r;
      }).catch(() => cached);
      return cached || red;
    })
  );
});
