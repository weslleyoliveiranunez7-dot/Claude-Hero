// Service worker: cache do app (offline). Mude VERSION a cada atualização.
const VERSION = 'ch-v3';
const FILES = [
  './', './index.html', './manifest.json',
  './css/style.css', './css/menu.css', './css/game.css', './css/mobile.css',
  './js/app.js', './js/router.js', './js/storage.js', './js/settings.js', './js/mascot.js', './js/background.js',
  './js/songs.js', './js/audio-engine.js', './js/gameplay.js', './js/play-screens.js',
  './js/db.js', './js/mp3-analyzer.js', './js/beat-detector.js', './js/note-generator.js', './js/library.js',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone();
    caches.open(VERSION).then(c => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request)));
});
