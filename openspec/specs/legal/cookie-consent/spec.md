# Consentimiento de cookies

## Descripción

Registro en base de datos de las decisiones del banner y panel de cookies de DeporTeen, complementario a la cookie cliente `dp_consent_v1` (`src/lib/consent.ts`).

## Requisitos funcionales

### RF-1: Registro auditable

- Cada guardado desde banner o panel MUST llamar a `POST /api/cookies/consent`.
- MUST persistir `consent_version`, `choices`, `created_at`, y `user_id` o visitante anónimo (`user_id` nulo, opcional `device_id`).

### RF-2: Categorías

| Clave | Descripción | Requiere consentimiento |
|-------|-------------|-------------------------|
| `necesarias` | Sesión, seguridad, checkout | No (siempre activas) |
| `analitica` | Medición (p. ej. GA4 según configuración) | Sí |
| `funcionales` | Mejoras no esenciales | Sí |
| `marketing` | Publicidad / perfiles (no usado actualmente en producto) | Sí |

### RF-3: Endpoint

- Entrada: `{ consent_version: string, choices: ConsentChoices, device_id?: string }`.
- Éxito: `{ ok: true }`.
- Fallo persistencia: `{ ok: false, warning: 'consent_not_persisted' }` con HTTP 200.
- Validación: HTTP 400.

### RF-4: Privacidad y acceso

- Sin almacenamiento de IP en `cookie_consents`.
- RLS: cada usuario autenticado inserta y lee solo lo suyo; anónimos solo insertan; `service_role` para operación.
- Retención: **pendiente Luis** — propuesta 24 meses desde `created_at` (ver change `c2026-09-27-cookie-consents-persistence`).

## Esquema `cookie_consents`

Ver migración `supabase/migrations/20260927170000_cookie_consents.sql`.
