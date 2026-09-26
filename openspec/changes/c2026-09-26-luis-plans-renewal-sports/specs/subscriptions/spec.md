# Delta — Suscripciones (Luis 26/09/2026)

## ADDED Requirements

### Requirement: Catálogo de tres planes comerciales

El producto MUST ofrecer **tres** planes de pago por asiento/jugador en `subscription_plans` y en la UI `/subscription`:

- Plan **anual** (~365 días)
- Plan **trianual** (~1095 días)
- Plan **para siempre** (periodo muy largo, sin renovación periódica)

Ningún flujo MUST asumir que solo existe el plan anual.

#### Scenario: Usuario ve los tres planes
- **WHEN** existen tres filas activas en `subscription_plans` con esos periodos
- **THEN** la UI MUST listar las tres opciones con precio y duración

### Requirement: Pago único sin renovación automática

Stripe Checkout para asientos MUST usar `mode: payment`. MUST NOT crearse suscripciones recurrentes Stripe para renovar asientos automáticamente.

#### Scenario: Compra de asiento
- **WHEN** el usuario completa un checkout de plan anual o trianual
- **THEN** se crea una fila `subscriptions` con `current_period_end` según `plan.days`
- **AND** no se programa cobro automático al vencer

### Requirement: Avisos de caducidad in-app

Con suscripción activa próxima a vencer (excluido plan para siempre), el sistema MUST mostrar aviso en `/dashboard` y `/account` con umbrales por defecto **30, 15, 7 y 1** días, configurables por `NEXT_PUBLIC_SUBSCRIPTION_EXPIRY_NOTICE_DAYS`.

#### Scenario: Aviso a 7 días
- **WHEN** `current_period_end` está a 5 días y `status` es activo
- **THEN** se muestra banner con CTA a `/billing/renew`

## MODIFIED Requirements

### RF-6: Suscripción activa

- Activa si `status` ∈ (`active`,`trialing`) **y** fecha de fin futura (función `isSubscriptionActive`).

### RF-4: Renovar suscripción

- Renovación es **manual**; extensión según decisión 7-B (apilar desde `current_period_end` vigente con `intent=renewal`).

## PROPOSED (infra)

### Requirement: Avisos por correo electrónico

Pendiente de elección de implementación (Supabase Cron + Edge Function, Vercel Cron + API route, o solo in-app). Ver `proposal.md` opciones A/B/C.
