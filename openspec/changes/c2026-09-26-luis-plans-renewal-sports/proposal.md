# Propuesta: planes Luis, renovación manual, deportes y avisos

## Contexto

Decisiones de Luis (26/09/2026), contrastadas en `docs/objetivo-vs-implementacion.md` (store del proyecto):

1. **Tres planes** comerciales por asiento: anual, trianual y para siempre (no solo anual).
2. **Sin renovación automática**: pago único por periodo (`mode: payment`); el usuario renueva manualmente con avisos previos.
3. **Deportes**: lista cerrada versionada en migraciones; protocolo documentado para altas futuras.
4. **RPC `seats_remaining`**: usado en cliente pero no versionado en repo.

## Objetivo

Alinear OpenSpec y código con esas decisiones sin tocar almacenamiento remoto/cuota ni ficheros de medios/partido en vivo (PR #48).

## Implementado en este change

- Spec base `subscriptions` y nueva spec `sports`.
- Migración: `seats_remaining` + seed `sports` (9 deportes, `stats` JSON).
- Avisos in-app escalonados (30/15/7/1 días, configurable) en dashboard y cuenta.
- Tests unitarios de lógica de avisos.

## Propuesta (infra no desplegada)

### Correo y tareas programadas

**Estado actual verificado:**

| Artefacto | Ubicación | Problema |
|-----------|-----------|----------|
| Edge Function `check-renewals` | `supabase/functions/check-renewals/index.ts` | Existe pero asume `status` booleano y un solo campo `notified_expiry_7d_at`; no está cableada a cron en repo |
| Banner cuenta | `account/page.tsx` | Sustituido por avisos escalonados in-app |
| Sin cron Vercel / pg_cron | — | No hay scheduler en el repositorio |

**Opciones para Luis (elegir una):**

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A** | Supabase Cron → Edge Function `check-renewals` (reescrita: `status` text, umbrales 30/15/7/1, columnas `notified_expiry_*_at` o tabla `subscription_expiry_notifications`) | Cerca de datos, Resend ya referenciado | Requiere secrets, despliegue función, migración columnas |
| **B** | Vercel Cron → route `/api/cron/subscription-expiry` (service role) | Mismo stack Next.js | Más carga en app; secret `CRON_SECRET` |
| **C** | Solo in-app (este change) | Cero infra nueva | Sin email si el usuario no abre la app |

**Parámetros acordados en spec (configurables):**

- In-app: `NEXT_PUBLIC_SUBSCRIPTION_EXPIRY_NOTICE_DAYS` (default `30,15,7,1`).
- Email (futuro): `SUBSCRIPTION_EXPIRY_EMAIL_NOTICE_DAYS` con mismos defaults; ventana de renovación anticipada `RENEW_WINDOW_DAYS` (15) ya en `src/config/constants.ts`.

## Migraciones en producción

Luis MUST aplicar en Supabase:

- `20260926120000_seats_remaining_and_sports_catalog.sql`

**Riesgo:** si `sports` ya tiene filas con otros UUID, el `ON CONFLICT (id)` actualiza solo los 9 IDs fijos; deportes duplicados por nombre deben limpiarse manualmente antes o después.

## Fuera de alcance

- Storage R2 / cuota / `NEXT_PUBLIC_CLOUD_MEDIA`.
- Sincronización de medios y live match (PR #48).
