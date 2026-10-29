// Ma routine : réseau d'abord (toujours la dernière version en ligne), cache en secours hors connexion.
const CACHE = 'routine-v3.1';
const SHELL = ['./', 'index.html', 'style.css?v=3.1', 'js/app.js?v=3.1', 'js/engine.js?v=3.1', 'js/program.js?v=3.1', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'motion/crossreach.webp', 'js/coach.json?v=3.1', 'audio/voice/index.json?v=3.1'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('.mp4')) return; // vidéos : lecture directe (requêtes partielles)
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })
    .catch(() => caches.match(req, { ignoreSearch: false }).then(r => r || caches.match(req, { ignoreSearch: true })).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
