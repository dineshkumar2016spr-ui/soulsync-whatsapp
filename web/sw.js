/* Soul Sync service worker: shows message notifications, including when the app is closed or
   installed on the phone. Cached assets are never served, so the UI always stays fresh. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Soul Sync', {
    body: d.body || 'New message',
    icon: 'agent.png',
    badge: 'agent.png',
    tag: d.tag || 'soulsync',
    renotify: true,
    data: { jid: d.jid || '' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) { try { await c.focus(); return; } catch { /* keep looking */ } }
    }
    if (self.clients.openWindow) await self.clients.openWindow('./index.html');
  })());
});
