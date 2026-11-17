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

### Edge Function `check-renewals` — estado real (no cableada)

**Qué hay hoy:** código en `supabase/functions/check-renewals/index.ts` (Resend + service role), **no** referenciado en `config.toml`, **sin** job en Supabase Cron ni en Vercel en el repo, **sin** despliegue documentado.

**Por qué no sirve tal cual para avisos por correo:**

| Gap | Detalle |
|-----|---------|
| Esquema `subscriptions.status` | Filtra `.eq("status", true)` y al caducar pone `status: false`. En producción `status` es **text** (`'active'`, `'canceled'`, …). La query de expiración y el paso 4 no seleccionan/actualizan filas reales. |
| Criterio “activa” | No usa `isSubscriptionActive` (falta comprobar `current_period_end > now()` al seleccionar). |
| Un solo umbral | Solo ventana configurable (default 7 días) y un campo `notified_expiry_7d_at`; el producto pide **30, 15, 7 y 1** días (como in-app). |
| Plan “para siempre” | No excluye periodos muy largos; podría enviar correos absurdos. |
| Desactivación al vencer | Paso 4 fuerza `status: false` en lugar de `'expired'` / respetar `subscriptions_status_check`; puede romper integridad o dejar datos incoherentes con la app. |
| Email / UX | Asunto fijo “7 días”, sin enlace a `/billing/renew`, sin i18n. |
| Operación | Requiere secrets en la función: `SERVICE_ROLE_KEY`, `CRON_BEARER`, `RESEND_API_KEY`, `RESEND_FROM`; dominio Resend verificado. |
| Disparador | Falta **scheduler** (Supabase Cron HTTP POST con Bearer, o Vercel Cron) y política de reintentos. |

**Qué habría que hacer para que la opción A sea viable** (solo tras decisión de Luis; **no** implementado en este change):

1. Reescribir la función: `status IN ('active','trialing')`, umbrales 30/15/7/1, marcas por umbral (columnas o tabla `subscription_expiry_notifications`), sin poner `status` booleano.
2. Migración SQL para columnas/tablas de “ya notificado a X días”.
3. Desplegar función + secrets en Supabase.
4. Crear Cron (p. ej. diario 09:00 UTC) → `POST /functions/v1/check-renewals` con `Authorization: Bearer <CRON_BEARER>`.
5. Decidir si al vencer solo se deja de contar como activa por fecha (como la app) o también se actualiza `status` a `'expired'`.

### Otras opciones de correo

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A** | Supabase Cron → `check-renewals` **reescrita** (ver gaps arriba) | Resend ya esbozado; datos en Supabase | Secrets + migración + despliegue + reescritura |
| **B** | Vercel Cron → `/api/cron/subscription-expiry` (service role, misma lógica que in-app + Resend/Nodemailer) | Un solo stack Next.js | Ruta nueva, `CRON_SECRET`, carga en app |
| **C** | Solo in-app (**implementado** en PR #50) | Cero infra | Sin email si el usuario no abre la app |

**Parámetros acordados en spec (configurables):**

- In-app: `NEXT_PUBLIC_SUBSCRIPTION_EXPIRY_NOTICE_DAYS` (default `30,15,7,1`).
- Email (futuro): `SUBSCRIPTION_EXPIRY_EMAIL_NOTICE_DAYS` con mismos defaults; ventana de renovación anticipada `RENEW_WINDOW_DAYS` (15) ya en `src/config/constants.ts`.

## Migraciones en producción

Script listo para el SQL Editor (idempotente, seguro con UUID existentes):  
**Project store** `docs/migracion-planes-deportes.sql` (misma lógica que la migración repo, sync por **slug** sin cambiar `id`).

Repo: `supabase/migrations/20260926120000_seats_remaining_and_sports_catalog.sql` (INSERT por id; en prod preferir el script del store).

**Riesgo deportes:** insertar por UUID fijo duplicaría filas si prod ya tiene el mismo deporte con otro `id`. El script del store **actualiza por slug** y solo inserta slugs faltantes; no reasigna FK. Riesgo residual: **legacy con guion bajo** (`futbol_sala`) coexistiendo con catálogo v1 (`futbol-sala`) — convención código = **guion** (`src/lib/sports/index.ts`). Reconciliación: store `docs/reconciliar-deportes-duplicados.sql`.

**`players.deleted_at`:** no existe en prod; el RPC `seats_remaining` cuenta solo `COALESCE(players.status, true)`. La app libera asiento con `status = false` (`deletePlayer` en cuenta). El borrado de cuenta intenta además `deleted_at` en `players`/`users` — si falla en prod, es decisión aparte (añadir columna o quitar ese UPDATE del código); fuera del alcance de este change salvo alinear el RPC.

## Fuera de alcance

- Storage R2 / cuota / `NEXT_PUBLIC_CLOUD_MEDIA`.
- Sincronización de medios y live match (PR #48).
