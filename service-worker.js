/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'smart-ac-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
];

let watchId = null;

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
  );
});

// Handle location tracking in background
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'START_TRACKING') {
    startLocationTracking();
  } else if (event.data && event.data.type === 'STOP_TRACKING') {
    stopLocationTracking();
  }
});

function startLocationTracking() {
  if ('geolocation' in navigator) {
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        // Kirim posisi ke main thread
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'LOCATION_UPDATE',
              location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }
            });
          });
        });
      },
      (error) => {
        console.error('Background location error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }
}

function stopLocationTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
} 