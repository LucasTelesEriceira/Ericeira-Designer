const CACHE_NAME = 'ericeira-cache-v1';
const STATIC_ASSETS = [
  './assets/android-chrome-192x192.png',
  './assets/android-chrome-512x512.png',
  './assets/apple-touch-icon.png',
  './assets/favicon-32x32.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Falha ao armazenar alguns assets no cache:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Manipula cliques na notificação nativa (Mobile e Desktop)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : 'agendamentos.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('agendamentos.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Suporte a mensagens Push futuras
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Novo Agendamento — Ericeira Designer';
  const options = {
    body: data.body || 'Um novo agendamento foi registrado.',
    icon: 'assets/android-chrome-192x192.png',
    badge: 'assets/favicon-32x32.png',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || 'agendamentos.html'
    },
    tag: data.tag || 'appointment-notification'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
