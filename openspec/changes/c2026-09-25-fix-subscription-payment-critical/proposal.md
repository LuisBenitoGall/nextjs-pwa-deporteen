# Propuesta: arreglo hallazgos críticos de pago y suscripción

## Contexto

Auditoría consolidada (`revision-completa-deporteen.md`, §2.1–2.2 y CRIT de suscripción): el flujo cobro → asientos → alta deportista falla por UI, APIs huérfanas, planes locales, doble escritura webhook/`confirm-session` y mensajes auth rotos.

## Objetivo

Restaurar un recorrido mínimo fiable: comprar/ampliar plazas, renovar, conceder asientos idempotente tras Stripe Checkout, redirecciones válidas y auth/i18n coherente en registro/login/check-email.

## Cambios acordados (implementación)

1. **Compra con suscripción activa**: no deshabilitar checkout en `/subscription`; copy de ampliación.
2. **Renovación**: planes desde `subscription_plans` (UUID); checkout vía JSON (`create-checkout-session`, `/api/billing/renew`); sin fallback `plan-1y` para pagar.
3. **Concesión de acceso**: función compartida `fulfillCheckoutSession`; tabla `stripe_checkout_fulfillments` (UNIQUE `stripe_checkout_session_id`); **insert** por checkout (varias filas `subscriptions` por usuario); webhook prioriza `metadata.user_id`; `confirm-session` autenticado e idempotente.
4. **Post-checkout**: éxito → CTA `/players/new`; eliminar `/players/bulk-new`.
5. **Dashboard**: distinguir “sin suscripción” vs “sin asientos” (`hasAnySubscription` + `pendingPlayers`).
6. **Auth**: `emailRedirectTo` en registro; `next` seguro en login; `/auth/check-email` con i18n.
7. **i18n (integración #44)**: `makeT` retorna `undefined` si falta clave; `useT` / `tServer` normalizan a `''` (ver change `c2026-09-25-platform-critical-fixes`). Locales: `es, en, ca, it, pt, eu, gl`.

## Migración

- `20260925140000_stripe_checkout_fulfillments.sql`

## Decisiones pendientes (Architecture)

| # | Tema | Opción A | Opción B |
|---|------|----------|----------|
| 1 | Cardinalidad `subscriptions` | **Implementado A**: una fila por checkout; asientos suman vía RPC/`seats_remaining` | Una fila por `user_id` con `upsert` (contradice spec actual RF-6 notas) |
| 2 | Extensión al renovar | Nueva fila con `current_period_end = now + plan.days` | Apilar desde el `current_period_end` vigente del asiento/jugador renovado |
| 3 | RF-6 “activa” solo por fecha vs `status`+fecha | Código usa `isSubscriptionActive` (`status` + fecha) | Spec RF-6 texto dice solo fecha — alinear spec o código |
| 4 | `confirm-session` vs webhook | Refuerzo UX idempotente (implementado) | Solo webhook; cliente solo polling |

## Fuera de alcance

CRIT-06 admin storage, CRIT-12 middleware, CRIT-13 open redirect callback, MED-08 portal Stripe, dominios partidos/medios/PWA.

## Verificación

- `pnpm build`, `pnpm lint`, `pnpm types`, `pnpm test:run` (tests nuevos de idempotencia).
- Sin credenciales Supabase/Stripe en VM: checkout, webhook y RLS **no** verificados en vivo.
