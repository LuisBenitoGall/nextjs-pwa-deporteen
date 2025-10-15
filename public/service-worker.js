/* eslint-env serviceworker */
// public/service-worker.js

const CACHE_PREFIX  = 'pwa-esports';
const CACHE_VERSION = 'v2';                // << súbelo para forzar actualización
const CACHE_NAME    = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const BLOCK_SITE    = false;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', () => {
  // Aquí podrías precachear si quieres
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Limpia caches antiguas
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) ? caches.delete(key) : null)
    );
    await self.clients.claim();
    // Nada de navegar a la fuerza todas las pestañas. Demasiado agresivo.
  })());
});

// ============ FETCH: ÚNICO HANDLER ============
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 0) Bloqueo total (debug)
  if (BLOCK_SITE === true) {
    if (req.mode === 'navigate' || req.destination === 'document') {
      event.respondWith(new Response(`<!doctype html><meta charset="utf-8"><title>Bloqueado</title>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }));
    } else {
      event.respondWith(new Response('', { status: 418, statusText: 'Blocked by Service Worker' }));
    }
    return;
  }

  // 1) Ignora cross-origin y SUPABASE (REST + Storage). No interceptar.
  const isCrossOrigin = url.origin !== self.location.origin;
  const isSupabase = url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.net');
  if (isCrossOrigin || isSupabase) return;

  // 2) Solo cachea GET. Todo lo demás, que pase directo.
  if (req.method !== 'GET') return;

  // 3) Estrategias:
  //    - Navegación (document): network-first para no servir app vieja
  //    - Assets estáticos: cache-first
  //    - Resto: network-first con fallback a cache
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(networkFirst(req));
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg');

  if (isStaticAsset) {
    event.respondWith(cacheFirst(req));
  } else {
    event.respondWith(networkFirst(req));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const resp = await fetch(request);
  // evita cachear respuestas opaques de cosas raras
  if (resp && resp.status === 200 && resp.type !== 'opaque') {
    cache.put(request, resp.clone());
  }
  return resp;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const resp = await fetch(request);
    if (resp && resp.status === 200 && resp.type !== 'opaque') {
      cache.put(request, resp.clone());
    }
    return resp;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // fallback mínimo
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

// Background Sync (opcional; no toca Supabase)
self.addEventListener('sync', (event) => {
  if (event.tag === 'media-sync') {
    event.waitUntil(fetch('/api/media/sync', { method: 'POST' }).catch(() => {}));
  }
});
