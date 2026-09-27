# Delta — Suscripciones (avisos email + cron)

## ADDED Requirements

### Requirement: Avisos de caducidad por correo electrónico

Con suscripción activa próxima a vencer (misma ventana y umbrales que avisos in-app: **30, 15, 7, 1** días por defecto), el sistema MUST enviar un correo explicativo indicando que **no hay renovación automática** y MUST incluir enlace a renovación manual (`/billing/renew`).

#### Scenario: Primer aviso a 30 días

- **WHEN** faltan 20 días naturales para `current_period_end` y no se ha notificado el umbral 30
- **THEN** se envía un correo en el idioma del usuario (`users.locale`)
- **AND** se registra el umbral 30 en `subscriptions.notified_expiry_email` para ese `periodEnd`

#### Scenario: No repetir el mismo umbral

- **WHEN** el cron se ejecuta de nuevo y el umbral ya consta en `notified_expiry_email` para el mismo `periodEnd`
- **THEN** no se reenvía correo para ese umbral

### Requirement: Tarea programada en Vercel

Un cron diario MUST invocar `GET|POST /api/cron/daily` con secreto `CRON_SECRET`. La ruta MUST ejecutar purga de `cookie_consents` y envío de avisos de caducidad.

#### Scenario: Invocación no autorizada

- **WHEN** la petición no incluye el Bearer correcto
- **THEN** responde HTTP 403

#### Scenario: Resend no configurado

- **WHEN** faltan `RESEND_API_KEY` o `RESEND_FROM`
- **THEN** la purga puede completarse
- **AND** la respuesta JSON indica `notConfigured` sin romper la aplicación
