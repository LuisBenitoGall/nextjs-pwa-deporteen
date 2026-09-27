# Propuesta: retención 24 meses, purga cookies, avisos email y cron Vercel

## Contexto (Luis 27/09/2026)

Sobre la base ya mergeada (#54, `cookie_consents`, `POST /api/cookies/consent`, `@/lib/cookie-consent`):

1. **Conservación** de registros de consentimiento: **24 meses** desde `created_at`, con **purga automática**.
2. **Política de privacidad**: reflejar el plazo real (no «hasta revocación») en todos los idiomas.
3. **Avisos de caducidad por correo** en umbrales **30, 15, 7 y 1** día, reutilizando la misma lógica que el banner in-app (`getSubscriptionExpiryNotice` / `resolveNoticeThresholdDays`), sin renovación automática, con enlace a `/billing/renew`.

## Decisión de infraestructura: cron en Vercel (opción B)

| Criterio | Vercel Cron → `/api/cron/daily` | Edge `check-renewals` (opción A) |
|----------|----------------------------------|----------------------------------|
| Estado actual | App ya en Vercel; sin secrets Supabase Functions cableados | Código desalineado (`status` booleano, un solo umbral 7d) |
| Lógica compartida | Import directo de `@/lib/subscriptions/expiry-notices` | Duplicar o empaquetar lógica Deno |
| Secretos | `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, Resend en env Vercel | Secrets en Supabase + cron HTTP aparte |
| Operación | `vercel.json` + env; un despliegue | Redeploy función + migración + cron Supabase |

**Elegido:** Vercel Cron diario (09:00 UTC) a ruta protegida por `Authorization: Bearer CRON_SECRET` (o `x-cron-secret`). La Edge Function en repo queda obsoleta; no se reescribe en este change.

## Alcance

- Migración: `notified_expiry_email` jsonb en `subscriptions`; comentario de retención en `cookie_consents`.
- Cron: purga `cookie_consents` + envío Resend idempotente por umbral.
- i18n: textos legales + plantillas de correo.
- Tests: umbrales, email state, cutoff 24 meses.

## Fuera de alcance

- Cambiar el flujo de registro inicial de consentimiento (#54).
- Desactivar `status` al vencer (la app ya usa fecha + `isSubscriptionActive`).

## Variables que debe configurar Luis (Vercel producción)

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `CRON_SECRET` | Sí (cron) | Bearer para `/api/cron/daily` |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí (cron) | Purga y lectura suscripciones/usuarios |
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Cliente admin |
| `RESEND_API_KEY` | Sí (email) | Envío; si falta, cron responde 200 con `notConfigured` |
| `RESEND_FROM` | Sí (email) | Remitente verificado en Resend |
| `NEXT_PUBLIC_SITE_URL` o `NEXT_PUBLIC_APP_URL` | Sí (enlaces) | URL absoluta a `/billing/renew` |

Opcional: `NEXT_PUBLIC_SUBSCRIPTION_EXPIRY_NOTICE_DAYS` (default `30,15,7,1`).

## Riesgos

- Sin `CRON_SECRET`, la ruta responde 403 (correcto).
- Sin Resend, no hay correos pero la purga sigue si hay service role.
- Primera ejecución tras deploy puede enviar muchos correos si hay suscripciones en ventana y columna vacía (comportamiento esperado por umbral).
