## Delta RF-1 (Instalación)

**Alcance de distribución:** DeporTeen es una PWA instalable desde el navegador; **no** hay empaquetado ni publicación en tiendas de aplicaciones (Play Store, App Store u otras). Los criterios siguientes no asumen requisitos de ficha de tienda.

### MODIFIED Criterios de Aceptación

- Los `shortcuts` del manifest MUST apuntar solo a rutas existentes en la app (p. ej. `/dashboard`, `/gallery`, `/players/new`, `/matches/new` tras integración #45).
- **Decisión Luis 11-B (2026-09-25):** el manifest **no** incluye `screenshots` hasta disponer de capturas acordadas con producto. No listar URLs rotas (MED-21). Cuando se añadan, será **mejora opcional de baja prioridad** para enriquecer el flujo de instalación en navegadores compatibles; no es obligatorio para el producto ni para ninguna tienda.
- Los merges de la pila #44→#45→#46 MUST mantener el manifest **sin** bloque `screenshots` hasta que existan PNG en `public/screenshots/`.

## Delta RF-2 (Service Worker)

### MODIFIED Criterios de Aceptación

- Tras un despliegue, un service worker en espera MUST activarse (`skipWaiting`) y las pestañas controladas recargan para no mezclar HTML/chunks de versiones distintas.
- Los assets `/_next/*` no se interceptan en el SW (network directo).

## Delta RF-3 (Almacenamiento local)

### MODIFIED Criterios de Aceptación

- Una sola base IndexedDB (`deporteens-media`) para blobs de partidos y almacenamiento legacy.
- La cola `mediaSync` reintenta subidas pendientes al evento `online` y actualiza `match_media`.
- El componente de arranque en el layout raíz MUST usar import dinámico de `mediaSync` (no import estático) para que `next build` pueda prerender sin exigir `NEXT_PUBLIC_SUPABASE_*` en la fase de compilación.
