/* AlioStore service worker - offline cache */
var CACHE_NAME = 'alistore-v3';
var CORE_ASSETS = [
  './',
  './index.html',
  './books-reader.html',
  './css/normalize.css',
  './css/style.css',
  './css/vendor.css',
  './icomoon/icomoon.css',
  './js/jquery-1.11.0.min.js',
  './js/plugins.js',
  './js/script.js',
  './js/bookdata-0.js',
  './js/bookdata-1.js',
  './js/bookdata-2.js',
  './js/bookdata-3.js',
  './js/bookdata-4.js',
  './js/bookdata-5.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS).catch(function () {});
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET' || request.url.indexOf('http') !== 0) {
    return;
  }

  /* Pages (navigations): always try the network first so updates
     show up immediately; fall back to cache when offline. */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      }).catch(function () {
        return caches.match(request).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  /* Static assets: cache-first with background refresh */
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) {
        fetch(request).then(function (response) {
          if (response && response.ok) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, copy);
            });
          }
        }).catch(function () {});
        return cached;
      }
      return fetch(request).then(function (response) {
        if (response && response.ok &&
            (response.type === 'basic' || response.type === 'cors')) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});