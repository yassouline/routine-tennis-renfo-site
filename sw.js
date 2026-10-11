// Ancien service worker du site chiffré : se désinstalle tout seul sur les appareils qui l'avaient.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.registration.unregister().then(() => self.clients.matchAll({ type: 'window' })).then(clients => clients.forEach(client => client.navigate(client.url)))));
