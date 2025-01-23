const CACHE_NAME = 'finance-manager-v1';
const urlsToCache = [
  '/finance-tracker/',
  '/finance-tracker/index.html',
  '/finance-tracker/css/styles.css',
  '/finance-tracker/js/app-core.js',
  '/finance-tracker/js/app-ui.js',
  '/finance-tracker/js/auth.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});