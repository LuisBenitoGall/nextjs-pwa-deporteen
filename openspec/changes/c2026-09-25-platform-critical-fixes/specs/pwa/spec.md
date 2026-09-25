## Delta RF-1 (Instalación)

### MODIFIED Criterios de Aceptación

- Los `shortcuts` del manifest MUST apuntar solo a rutas existentes en la app (p. ej. `/dashboard`, `/gallery`, `/players/new`). No deben referenciar rutas no implementadas como `/matches/new`.
- Las entradas `screenshots` del manifest solo se publican cuando los archivos existen en `public/screenshots/`; hasta entonces el manifest no debe listar URLs rotas.

## Delta RF-2 (Service Worker)

### MODIFIED Criterios de Aceptación

- Tras un despliegue, un service worker en espera MUST activarse (`skipWaiting`) y las pestañas controladas recargan para no mezclar HTML/chunks de versiones distintas.
- Los assets `/_next/*` no se interceptan en el SW (network directo).

## Delta RF-3 (Almacenamiento local)

### MODIFIED Criterios de Aceptación

- Una sola base IndexedDB (`deporteens-media`) para blobs de partidos y almacenamiento legacy.
- La cola `mediaSync` reintenta subidas pendientes al evento `online` y actualiza `match_media`.
- El componente de arranque en el layout raíz MUST usar import dinámico de `mediaSync` (no import estático) para que `next build` pueda prerender sin exigir `NEXT_PUBLIC_SUPABASE_*` en la fase de compilación.
