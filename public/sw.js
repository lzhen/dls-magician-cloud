'use strict';

const APP_BASE_PATH = new URL(self.location.href).pathname.replace(/\/sw\.js$/, '');
const CACHE_PREFIX = `dls-magician${APP_BASE_PATH.replaceAll('/', '-')}-`;
const CACHE_VERSION = `${CACHE_PREFIX}original-svg-20261021-v1`;
const appPath = path => `${APP_BASE_PATH}${path}`;
const APP_SHELL = [
  '/icons/dls-32-20261008.png',
  '/icons/dls-180-20261008.png',
  '/icons/dls-192-20261008.png',
  '/icons/dls-512-20261008.png',
  '/icons/dls-1024-20261008.png',
  '/',
  '/index.html',
  '/styles.css?v=brand-lockup-20261021-original-svg',
  '/app.js?v=brand-lockup-20261021-original-svg',
  '/interaction-engine.js?v=inline-and-1',
  '/component-preview.js?v=inline-and-1',
  '/component-preview.css?v=inline-and-1',
  '/component-autocomplete.js?v=inline-and-1',
  '/component-autocomplete.css?v=inline-and-1',
  '/logo.svg',
  '/logo-light.svg',
  '/manifest.webmanifest',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png'
].map(appPath);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(`${APP_BASE_PATH}/`) || url.pathname.startsWith(appPath('/api/'))) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(appPath('/index.html'), copy));
          return response;
        })
        .catch(() => caches.match(appPath('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone()));
        return response;
      });
      return cached || network;
    })
  );
});

