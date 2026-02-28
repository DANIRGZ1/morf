/* ── Service Worker — morf ─────────────────────────────────────────────────
   Cache-first para assets estáticos; stale-while-revalidate para HTML.    */

const CACHE = 'morf-v1';
const PRECACHE = ['/', '/favicon.svg', '/manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Solo interceptar misma origen
  if (url.origin !== self.location.origin) return;

  // Archivos estáticos (JS, CSS, imágenes, fuentes) → cache-first
  if (/\.(js|css|woff2?|png|svg|ico|webp|jpg)(\?.*)?$/.test(url.pathname)) {
    e.respondWith(
      caches.match(request).then(cached =>
        cached || fetch(request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Navegación HTML → stale-while-revalidate (siempre sirve index.html offline)
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/') )
    );
    return;
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const win = cs.find(c => c.url.startsWith(self.location.origin));
      return win ? win.focus() : self.clients.openWindow('/');
    })
  );
});
