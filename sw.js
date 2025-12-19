const CACHE_NAME = 'aiva-chronos-v1';
const assets = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './image_0.png',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(assets))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
