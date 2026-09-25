# Propuesta: correcciones críticas de plataforma (medios, PWA, i18n, auth callback)

## Contexto

Informe consolidado `revision-completa-deporteen.md` (auditoría plataforma, IDs N-/M-/E-CRIT). Este change cubre el alcance asignado al agente de plataforma **sin** tocar Stripe/suscripciones ni formularios de jugadores/partidos gestionados por otros agentes.

## Objetivos

1. **Auth**: evitar open redirect en OAuth callback validando `next` (N-CRIT-3 / CRIT-13).
2. **Medios**: timeout en subidas, `device_uri` coherente en R2, una sola IndexedDB, cola `mediaSync` activa al volver online (M-CRIT-2/3, M-ALT-2/3).
3. **PWA**: atajos del manifest alineados con rutas existentes, screenshots inválidos retirados hasta tener assets, SW que active actualización tras deploy (N-ALT-2, MED-21, MED-23).
4. **i18n**: claves usadas en código presentes en `es.json`, `makeT` devuelve `undefined` si falta clave (patrón `||` útil), banner de instalación traducible, test CI de claves (ALTO-04, MED-22, MED-26, MED-27).
5. **Locales**: **decisión cerrada** — los locales soportados son los de `SUPPORTED_LOCALES` en `src/i18n/config.ts`: `es`, `en`, `ca`, `it`, `pt`, `eu`, `gl` (alineado con `openspec/specs/internationalization/spec.md` RF-1). Los tests deben incluir `pt`; no se elimina portugués.

## Fuera de alcance (otros agentes / fases)

- CRIT-01–07, CRIT-16 (Stripe/suscripción), CRIT-08–11 (partidos/jugadores/datos), CRIT-12 (middleware sin env), ALTO-01 (login `next`), rutas `/matches/new`, bulk-new, live `loadError` vs `saveError`, etc.

## Riesgos

- Usuarios con IndexedDB antigua (`pwa-esports-media`) no migran datos automáticamente; blobs nuevos usan `deporteens-media` v2.
- Sin credenciales Supabase/R2 en CI: subida y sync no verificados E2E.

## Verificación

- `pnpm lint`, `pnpm types`, `pnpm test:run`, `pnpm build`.
- OpenSpec CLI no instalada en el repo; validación manual de deltas en `specs/`.
