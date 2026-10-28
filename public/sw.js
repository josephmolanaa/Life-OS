// Retire the former Life OS worker. Never intercept requests or cache private data.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('life-os-')).map(key => caches.delete(key))
  )).then(() => self.registration.unregister()));
});
