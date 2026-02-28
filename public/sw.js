/* ── Service Worker — morf ─────────────────────────────────────────────────
   Solo gestiona notificaciones locales; sin caché extra.               */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const win = cs.find(c => c.url.startsWith(self.location.origin));
      return win ? win.focus() : self.clients.openWindow('/');
    })
  );
});
