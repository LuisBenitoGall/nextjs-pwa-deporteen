## Delta — Cola de medios offline (MED-23)

### RF — Sincronización (modificado)

**Criterios de aceptación:**

- Cola `localStorage` (`media_pending_queue_v1`) procesada por `trySyncAll` al volver online, Background Sync tag `media-sync`, y subida remota vía `/api/remote-media/upload` cuando el proveedor es `r2` o `supabase`.
- Evento `media-sync-status` con `{ uploaded, failed, remaining }` para feedback UI.

### RF — Feedback global (añadido)

**Criterios de aceptación:**

- Componente montado en layout (`MediaSyncStatusBanner`) escucha `media-sync-status` y muestra aviso no bloqueante con acción «Reintentar» (`requestBackgroundMediaSync`) si `remaining > 0` o `failed > 0`.
- Copy i18n: `media_sync_pending`, `media_sync_failed`, `media_sync_success`, `media_sync_retry`.

### NOTA — Service Worker

- Network-first para assets; **no** cachear HTML de navegación (comportamiento existente en `public/service-worker.js`).
- Alternativa futura: precache de blobs IndexedDB vía SW (fuera de alcance).
