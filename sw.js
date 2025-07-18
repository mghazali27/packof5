const CACHE_NAME = 'datamatrix-converter-cache-v1';
const urlsToCache = [
  '.',
  'index.html',
  'style.css',
  'script.js',
  'database.json',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// Install the service worker and cache all the app's assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch assets from the cache first, falling back to the network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});