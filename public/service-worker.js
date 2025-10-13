const CACHE_PREFIX = 'pwa-esports';
const CACHE_VERSION = 'v1';
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const BLOCK_SITE = false;     //Bloqueo de todo el site = true

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', event => {
  console.log('Service Worker instalado');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activado');
  // Limpia cachés antiguas y reclama control
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
      // Fuerza recarga de todas las pestañas para garantizar
      // que el fetch de navegación quede bajo control del SW.
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        try {
          await client.navigate(client.url);
        } catch (e) {
          // Navegar puede fallar en algunos navegadores si no está visible; ignorar.
        }
      }
    })()
  );
});

self.addEventListener('fetch', (event) => {
  // Bloqueo de prueba (prioritario). Asegúrate de tener un único handler.
  if (typeof BLOCK_SITE !== 'undefined' && BLOCK_SITE === true) {
    if (event.request.mode === 'navigate' || event.request.destination === 'document') {
      event.respondWith(
        new Response(`<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bloqueado por Service Worker</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; height:100vh; display:flex; align-items:center; justify-content:center; background:#0b0b0b; color:#fff; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
  .box { max-width:720px; padding:28px; border:2px dashed #ff4d4f; border-radius:16px; text-align:center; }
  h1 { margin:0 0 8px; font-size:28px; }
  p { margin:6px 0; }
  .small { opacity:.8; font-size:12px; }
  code { background:#222; padding:2px 6px; border-radius:6px; }
  a { color:#61dafb; }
  </style>
</head><body>
  <div class="box">
    <h1>DeporTeen ha sido bloqueado temporalmente.</h1>
    <p>El site ha sido bloqueado temporalmente por razones técnicas. Prueba de nuevo en unos instantes. Disculpa las molestias.</p>
  </div>
</body></html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
        )
      );
      return;
    }
    // Bloquea también otros recursos si se desea (opcional)
    event.respondWith(new Response('', { status: 418, statusText: 'Blocked by Service Worker' }));
    return;
  }

  // Estrategia por defecto (cache-first con fallback a red)
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
