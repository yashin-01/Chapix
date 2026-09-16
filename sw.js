// Service Worker para Generador de Chapas Pro (PWA Offline con Actualización Automática)
const CACHE_NAME = 'chapas-pro-v6';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instalación: Pre-cargar archivos e instalar inmediatamente sin esperar a que se cierren pestañas
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

// Activación: Tomar el control de los clientes de inmediato y purgar cachés viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch:
// 1. Para HTML y navegación (index.html): NETWORK-FIRST
//    Si hay conexión a internet, descarga siempre la versión más reciente en vivo y actualiza la caché.
//    Si el usuario está sin internet (offline), carga la versión guardada en caché.
//    -> Esto elimina para siempre la necesidad de que los usuarios hagan Ctrl+F5 para ver cambios.
// 2. Para otros recursos estáticos (imágenes, iconos, fuentes): CACHE-FIRST con respaldo offline.
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  const isNavigation = event.request.mode === 'navigate' ||
                       event.request.destination === 'document' ||
                       event.request.url.endsWith('.html') ||
                       event.request.url.endsWith('/');

  if (isNavigation) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Si no hay red, servir la última versión guardada en caché
          return caches.match(event.request) || caches.match('./index.html') || caches.match('./');
        })
    );
    return;
  }

  // Recursos estáticos
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
