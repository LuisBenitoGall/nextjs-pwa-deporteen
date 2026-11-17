# Spec: Testing – Suscripciones y seats

## ADDED Requirements

### Requirement: Tests unitarios del criterio "suscripción activa"

El sistema de tests MUST incluir una suite que verifique el criterio canónico de suscripción activa (status textual compatible con Stripe y `current_period_end`).

#### Scenario: Suscripción active con periodo futuro

- **WHEN** la suscripción tiene `status === 'active'` y `current_period_end` es una fecha futura
- **THEN** el helper de "suscripción activa" devuelve `true`

#### Scenario: Suscripción active con periodo vencido

- **WHEN** la suscripción tiene `status === 'active'` y `current_period_end` es una fecha pasada
- **THEN** el helper de "suscripción activa" devuelve `false`

#### Scenario: Suscripción trialing con periodo futuro

- **WHEN** la suscripción tiene `status === 'trialing'` y `current_period_end` es una fecha futura
- **THEN** el helper de "suscripción activa" devuelve `true`

#### Scenario: Estados no activos

- **WHEN** la suscripción tiene `status` en `canceled`, `unpaid`, `paused`, `past_due`, `incomplete` o `incomplete_expired`
- **THEN** el helper de "suscripción activa" devuelve `false`

#### Scenario: current_period_end nulo con status active

- **WHEN** la suscripción tiene `status === 'active'` y `current_period_end === null`
- **THEN** el helper de "suscripción activa" devuelve `true` (suscripción sin caducidad)

---

### Requirement: Tests unitarios de getSeatStatus (seats)

El sistema de tests MUST cubrir el comportamiento de `getSeatStatus` frente a la RPC `seats_remaining`.

#### Scenario: RPC devuelve remaining > 0

- **WHEN** la RPC `seats_remaining` devuelve correctamente un valor `remaining > 0`
- **THEN** `getSeatStatus` devuelve un objeto con `remaining` coherente y sin error

#### Scenario: RPC devuelve remaining === 0

- **WHEN** la RPC `seats_remaining` devuelve `remaining === 0`
- **THEN** `getSeatStatus` devuelve `remaining: 0` y la UI no debe permitir alta de nuevo jugador (ver tests de NewPlayerForm)

#### Scenario: RPC falla

- **WHEN** la llamada a `seats_remaining` falla (error de Supabase)
- **THEN** `getSeatStatus` se comporta de forma "fail closed" (p. ej. remaining 0 o error manejado) y no se permite asumir seats disponibles

---

### Requirement: Tests de integración de la página de suscripción (códigos y plan)

El sistema de tests MUST incluir pruebas de la página `/subscription` relativas a códigos de acceso y selección de plan, usando mocks.

#### Scenario: Código válido aplicado

- **WHEN** el usuario introduce un código válido y confirma
- **THEN** se invoca la lógica/RPC esperada (`create_code_subscription` o equivalente) y se refleja suscripción creada o seats actualizados en el estado mockeado

#### Scenario: Código inválido o agotado

- **WHEN** el usuario introduce un código inválido o agotado
- **THEN** se muestra mensaje de error adecuado y no se modifica la suscripción actual

#### Scenario: Selección de plan y unidades sin código

- **WHEN** el usuario selecciona un plan de pago y número de unidades y inicia checkout
- **THEN** se realiza la llamada esperada a la API de creación de sesión Stripe (mock) con parámetros coherentes (plan_id, units, etc.)

---

### Requirement: Tests de confirmación de sesión Stripe y webhook

El sistema de tests MUST verificar la lógica de confirmación de pago y, si se testea, la de webhook de Stripe, con mocks.

#### Scenario: Confirmación de sesión exitosa

- **WHEN** la API de confirmación de sesión recibe una sesión de Stripe completada correctamente (mock)
- **THEN** se actualiza el estado de `subscriptions` (o equivalente mockeado) con status activo y periodo correspondiente

#### Scenario: Confirmación de sesión fallida

- **WHEN** la sesión de Stripe indica pago fallido o cancelado (mock)
- **THEN** no se crea ni actualiza la suscripción como activa

#### Scenario: Idempotencia del webhook (si se testea)

- **WHEN** se procesa el mismo evento de webhook de Stripe dos veces (mock)
- **THEN** no se duplican filas en `subscriptions` ni efectos secundarios; el resultado es idempotente
