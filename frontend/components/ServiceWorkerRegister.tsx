'use client';

import { useEffect } from 'react';

const CLEAN_FLAG = 'alistore:sw-cleaned:v6';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      const meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-capable';
      meta.content = 'yes';
      document.head.appendChild(meta);
    }

    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/alistore/sw.js', { scope: '/alistore/' }).catch(() => {});
    };

    // Earlier versions of this worker cached every same-origin response, including
    // book covers, and reloaded the page on 'controllerchange'. Browsers that ran
    // them can still be holding hundreds of megabytes of poisoned cache entries,
    // which get served in place of real cover images. Clearing them once, on the
    // first load after this update, is the only reliable way out.
    const withTimeout = <T,>(work: Promise<T>, ms: number): Promise<T> =>
      Promise.race([work, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms))]);

    const purgeWorkerState = async (): Promise<{ wasControlled: boolean; verified: boolean }> => {
      const wasControlled = !!navigator.serviceWorker.controller;
      const diag: Record<string, unknown> = { wasControlled };
      let verified = false;
      try {
        const registrations = await withTimeout(navigator.serviceWorker.getRegistrations(), 10000);
        diag.regs = registrations.length;
        diag.unregistered = await withTimeout(Promise.all(registrations.map((r) => r.unregister())), 10000);
        const keys = await withTimeout(caches.keys(), 10000);
        diag.cacheKeys = keys;
        diag.deleted = await withTimeout(Promise.all(keys.map((k) => caches.delete(k))), 10000);
        const keysAfter = await withTimeout(caches.keys(), 10000);
        diag.keysAfter = keysAfter;
        // Only claim success once the caches are actually gone. Anything less and
        // the next load has to try again.
        verified = keysAfter.length === 0;
      } catch (err) {
        diag.error = `${(err as Error)?.name}: ${(err as Error)?.message}`;
      }
      diag.verified = verified;
      try {
        localStorage.setItem('alistore:sw-diag', JSON.stringify(diag));
      } catch {
        // ignore
      }
      return { wasControlled, verified };
    };

    const boot = async () => {
      let alreadyCleaned = false;
      try {
        alreadyCleaned = !!localStorage.getItem(CLEAN_FLAG);
      } catch {
        alreadyCleaned = false;
      }

      if (alreadyCleaned) {
        register();
        return;
      }

      const { wasControlled, verified } = await purgeWorkerState();

      // The flag is written only after a verified clean. If the purge threw or
      // stalled, the flag stays unset so the next page load retries instead of
      // stranding a browser with its stale cache forever.
      if (verified) {
        try {
          localStorage.setItem(CLEAN_FLAG, '1');
        } catch {
          // Private mode: the cleanup simply runs again on the next load.
        }
      }

      // One deliberate reload, guarded by the flag above so it can only ever happen
      // once. This is required because the current page may still be reading
      // responses from the worker we just unregistered.
      if (verified && wasControlled) {
        window.location.reload();
        return;
      }

      register();
    };

    // React can hydrate after the load event has already fired, in which case a
    // listener added here would never run.
    if (document.readyState === 'complete') boot();
    else window.addEventListener('load', boot, { once: true });

    // Deliberately no reload on 'controllerchange'. A newly activated worker claims
    // existing clients on its own, and reloading here aborted in-flight requests,
    // which left book covers blank after a refresh.
  }, []);

  return null;
}
