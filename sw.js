// Service Worker for push notifications.
// This runs separately from the main app — it stays alive in the
// background (managed by the browser/OS) so notifications can arrive
// even when the app itself is closed.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// A push message arrived from the server (our Edge Function).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Artist App', body: event.data ? event.data.text() : 'Tienes una notificación nueva' };
  }

  const title = data.title || 'Artist App';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: data.url || '/app.html',
      taskId: data.taskId || null,
    },
    tag: data.tag || undefined, // same tag replaces a previous notification instead of stacking
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Person tapped the notification — close it and focus/open the app,
// landing on the relevant task if we have one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/app.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open in some tab, focus it and navigate there.
      for (const client of clientList) {
        if (client.url.includes(new URL(targetUrl, self.location.origin).pathname) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a fresh window/tab.
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
