'use client';
import { useEffect, useSyncExternalStore } from 'react';

function subscribeConnection(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function PwaRegister() {
  const online = useSyncExternalStore(subscribeConnection, () => navigator.onLine, () => true);
  useEffect(() => {
    // ponytail: online-only; add offline storage only with explicit private-data lifecycle rules.
    if ('serviceWorker' in navigator) {
      const workerUrl = new URL('/sw.js', window.location.origin).href;
      navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(
        registrations.filter(registration => [registration.active, registration.waiting, registration.installing]
          .some(worker => worker?.scriptURL === workerUrl))
          .map(registration => registration.unregister())
      )).catch(() => { /* Cleanup can retry on the next visit. */ });
    }
    if ('caches' in window) {
      caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('life-os-')).map(key => caches.delete(key))))
        .catch(() => { /* Cleanup can retry on the next visit. */ });
    }
  }, []);
  if (online) return null;
  const id = document.documentElement.lang.startsWith('id');
  return <div role="status" style={{ position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 200, width: 'min(92vw, 560px)', padding: '12px 16px', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: '0 4px 20px #0002' }}>
    {id ? 'Anda sedang offline. Life OS membutuhkan internet untuk memuat dan menyimpan data.' : 'You are offline. Life OS needs internet to load and save data.'}
  </div>;
}
