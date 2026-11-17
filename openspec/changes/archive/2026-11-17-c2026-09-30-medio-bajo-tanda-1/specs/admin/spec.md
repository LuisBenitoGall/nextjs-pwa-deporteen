## MODIFIED Requirements

### Admin — Stripe Subscriptions (modo payment)

- La página `/admin/stripe/subscriptions` MUST mostrar un aviso visible de que DeporTeen vende asientos vía Checkout en modo `payment` y que las suscripciones operativas del producto se gestionan en `/admin/suscripciones` (tabla `subscriptions` / fulfillments), no necesariamente como objetos `Subscription` recurrentes en Stripe.
