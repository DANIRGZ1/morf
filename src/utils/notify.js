/* ── Notificaciones locales PWA ──────────────────────────────────────────── */

/** Pide permiso de notificación. Llámala justo antes de iniciar una conversión. */
export async function requestNotifyPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

/** Muestra notificación "tu conversión está lista" solo si el tab no está visible. */
export async function notifyDone(label) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState !== 'hidden') return;

  const title = '✅ Tu conversión está lista';
  const body  = label ? `${label} está listo para descargar` : 'Tu archivo está listo';
  const opts  = { body, icon: '/favicon.svg', badge: '/favicon.svg', tag: 'morf-conv', renotify: true };

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, opts);
      return;
    } catch { /* fallback */ }
  }
  new Notification(title, opts);
}
