# Propuesta: fiabilidad datos, formularios y partidos

## Contexto

Auditoría consolidada (secciones 2.3–2.6): callejones sin salida en alta de deportista, competición/partido, guardado en vivo y operaciones admin; pérdida silenciosa de datos y rutas 404.

## Objetivo

Restaurar flujos de jugadores, competiciones y partidos sin tocar suscripción/Stripe ni medios/PWA globales (otros cambios en paralelo).

## Alcance implementado

- Admin jugadores: columna `full_name` coherente con BD.
- API partidos: PATCH/DELETE con ownership, 404 si no hay fila, limpieza `match_media`/almacenamiento al borrar.
- Live: errores de guardado no sustituyen la UI completa.
- Rutas: `/matches/new`, `/players/bulk-new`, historial por temporada.
- Dashboard: estados de asientos y CTA de alta.
- Temporada: provisión automática vía API (`ensureCurrentSeasonId`).
- Competición: equipo obligatorio al crear; API con límites; pantalla de edición.
- Selector de competición filtrado por `player_id`.
- `/players/edit` funcional con `?id=`.
- Alta deportista: rollback soft-delete si falla post-RPC.

## Decisiones pendientes (Architecture)

Ver `decisions.md` — contradicciones spec/código no resueltas en este change.

## Integración con change plataforma (#44)

- `manifest.ts`: atajos unificados (panel, galería, partidos, deportista). **Decisión Luis 11-B:** sin entradas `screenshots` (PWA solo web; capturas pendientes de Luis como mejora opcional de instalación en navegador, no requisito de tienda).
- `matches/[id]/live`: conserva subida híbrida IndexedDB + `fetchWithTimeout` de #44 con errores `loadError`/`saveError` de este change.

## Riesgos

- `ensureCurrentSeasonId` usa service role; requiere política de datos acordada.
- Rollback de alta con `status: false` no revierte asiento si el RPC ya consumió plaza (ver decisión A/B transacción RPC).
