'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      const meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-capable';
      meta.content = 'yes';
      document.head.appendChild(meta);
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/alistore/sw.js', { scope: '/alistore/' }).catch(() => {});
      });
    }
  }, []);

  return null;
}