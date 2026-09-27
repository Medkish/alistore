const SHELL = '/alistore/';

self.addEventListener('install', () => {
  self.skipWaiting();
});

// Earlier versions of this worker cached every same-origin response, including
// book covers, which grew to hundreds of megabytes of stale entries that were then
// served in place of the real images. This worker no longer caches anything: it
// exists only to take over from those versions, to drop their leftovers, and to
// stop the browser from running them again.
//
// Note there is deliberately no 'fetch' handler. Without one every request goes
// straight to the network, so a cover can never be blanked or pinned by a cache
// entry, and no cache write can hold a lock that stalls the cleanup path.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Best effort, and never allowed to block activation: a browser that stalls
      // here would otherwise keep serving the old worker.
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        // The application also purges on first load, so a failure here is not fatal.
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'ALISTORE_CACHES_CLEARED') {
    event.waitUntil(
      (async () => {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        } catch {
          // ignore
        }
      })()
    );
  }
});
