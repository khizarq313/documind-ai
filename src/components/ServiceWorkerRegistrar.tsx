'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker for PWA functionality.
 * This component renders nothing — it only runs the registration side effect.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[DocuMind] Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('[DocuMind] Service Worker registration failed:', err);
        });
    }
  }, []);

  return null;
}
