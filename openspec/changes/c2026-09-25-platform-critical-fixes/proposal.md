# Propuesta: correcciones críticas de plataforma (medios, PWA, i18n, auth callback)

## Contexto

Informe consolidado `revision-completa-deporteen.md` (auditoría plataforma, IDs N-/M-/E-CRIT). Este change cubre el alcance asignado al agente de plataforma **sin** tocar Stripe/suscripciones ni formularios de jugadores/partidos gestionados por otros agentes.

## Objetivos

1. **Auth**: evitar open redirect en OAuth callback validando `next` (N-CRIT-3 / CRIT-13).
2. **Medios**: timeout en subidas, `device_uri` coherente en R2, una sola IndexedDB, cola `mediaSync` activa al volver online (M-CRIT-2/3, M-ALT-2/3).
3. **PWA**: atajos del manifest alineados con rutas existentes, screenshots inválidos retirados hasta tener assets, SW que active actualización tras deploy (N-ALT-2, MED-21, MED-23).
4. **i18n**: claves usadas en código presentes en `es.json`, `makeT` devuelve `undefined` si falta clave (patrón `||` útil), banner de instalación traducible, test CI de claves (ALTO-04, MED-22, MED-26, MED-27).
5. **Locales**: **decisión Luis (10-A, 2026-09-25)** — locales oficiales `es`, `en`, `ca`, `it`, `pt`, `eu`, `gl` en `SUPPORTED_LOCALES`; tests incluyen `pt`.

## Integración con otros changes (2026-09-25)

- **#45** añade atajos `/matches/new` y `screenshots` en manifest; al integrar, el manifest unificado combina panel/galería (#44) + partidos (#45). Actualizar delta PWA RF-1 en Architecture si se confirma `/matches/new` como atajo oficial.
- **#46** adopta semántica `makeT` → `undefined` y normalización en `useT`/`tServer` (este change); no usar `makeT` → `''` a nivel diccionario.

## Fuera de alcance (otros agentes / fases)

- CRIT-01–07, CRIT-16 (Stripe/suscripción), CRIT-08–11 (partidos/jugadores/datos), CRIT-12 (middleware sin env), ALTO-01 (login `next`), bulk-new, live `loadError` vs `saveError`, etc.

## Decisiones de producto (Luis, 2026-09-25)

| # doc | Decisión | Registro |
|-------|----------|----------|
| 10 | A — lista de locales anterior | Ver objetivo 5 |
| 12 | B — sin migración automática IndexedDB | Notas de versión abajo |

### Notas de versión (IndexedDB)

- La base antigua `pwa-esports-media` **no se migra** automáticamente. Los blobs nuevos usan `deporteens-media` (v2). Los medios solo en la BD antigua pueden no aparecer hasta re-subir o recuperar manualmente.

## Riesgos

- Usuarios con IndexedDB antigua (`pwa-esports-media`) no migran datos automáticamente; blobs nuevos usan `deporteens-media` v2 (decisión 12-B).
- Sin credenciales Supabase/R2 en CI: subida y sync no verificados E2E.

## Verificación

- `pnpm lint`, `pnpm types`, `pnpm test:run`, `pnpm build`.
- OpenSpec CLI no instalada en el repo; validación manual de deltas en `specs/`.
