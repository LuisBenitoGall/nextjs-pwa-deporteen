## Delta — PWA y medios offline

### RF — Service Worker (modificado)

**Criterios de Aceptación** (añadir):

- El evento `sync` con tag `media-sync` notifica a las ventanas abiertas (`postMessage`) para ejecutar la cola local (`trySyncAll`), sin llamar a rutas API inexistentes.
- Tras volver online, `MediaSyncBootstrap` registra Background Sync cuando el navegador lo soporta y reintenta la cola.

### RF — Sincronización de medios (modificado)

**Criterios de Aceptación** (añadir):

- La cola en `localStorage` reintenta según el proveedor activo (`/api/storage/provider`): bucket Supabase `matches` o subida R2 vía `/api/r2/upload`.
- Fallos parciales emiten evento `media-sync-status` para feedback en la UI del partido en vivo.
- Subidas R2 fallidas encolan reintento local cuando procede.
