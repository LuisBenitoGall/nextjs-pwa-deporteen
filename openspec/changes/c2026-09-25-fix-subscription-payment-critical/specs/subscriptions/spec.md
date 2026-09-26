# Delta — Suscripciones y pagos

## ADDED Requirements

### Requirement: Idempotencia de concesión tras Checkout

El sistema MUST registrar cada `checkout.session` completado como máximo una vez en `stripe_checkout_fulfillments` y MUST crear como máximo una fila nueva en `subscriptions` por sesión de pago de deportistas.

#### Scenario: Reintento de webhook
- **WHEN** Stripe reenvía `checkout.session.completed` para la misma sesión
- **THEN** no se duplican asientos ni filas de suscripción

#### Scenario: Webhook y confirm-session
- **WHEN** el cliente llama a `confirm-session` tras un pago ya procesado por webhook
- **THEN** la respuesta es idempotente (`already`) sin efectos secundarios

### Requirement: Ampliación de plazas con suscripción activa

Un usuario autenticado con suscripción activa MUST poder iniciar un nuevo Checkout para comprar plazas adicionales desde `/subscription`.

### Requirement: Renovación con planes de BD

`/billing/renew` MUST cargar planes desde `subscription_plans` (UUID) y MUST NOT ofrecer checkout con ids locales de fallback cuando la BD no está disponible.

## MODIFIED Requirements

### RF-2: Procesar Pago con Stripe

- La concesión de asientos MUST realizarse mediante inserción idempotente por `session.id` (no `upsert` por `user_id`).
- La resolución de usuario MUST priorizar `session.metadata.user_id`.

### RF-4: Renovar Suscripción

- Renovación multi-deportista MUST usar `POST /api/billing/renew` (JSON) o checkout JSON equivalente.
- Renovación mono-asiento MUST usar checkout JSON (`create-checkout-session`).
- **Decisión Luis 7-B (2026-09-25):** checkout con `metadata.intent = renewal` MUST calcular `current_period_end` de la nueva fila como **`max(current_period_end vigente, now) + plan.days`**, para no perder días en renovaciones anticipadas.

### RF-6: Suscripción activa

- **Decisión Luis 8-A (2026-09-25):** una suscripción está activa si `status` indica activo **y** `current_period_end` es posterior a ahora (`isSubscriptionActive` en código). El spec MUST alinearse con esta regla (no solo fecha).

### Cardinalidad (decisión Luis 6-A)

- Un usuario MAY tener **varias filas** en `subscriptions` (una por checkout). Los asientos disponibles se calculan vía RPC/`seats_remaining`, no con una única fila por usuario.

### Concesión tras pago (decisión Luis 9-A)

- Webhook Stripe es fuente de verdad; `confirm-session` autenticado es refuerzo UX **idempotente** guardado por `stripe_checkout_fulfillments`.
