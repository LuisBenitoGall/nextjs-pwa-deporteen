## Why

Un usuario que nunca ha tenido suscripción ve el banner «Tu suscripción ha vencido» y el enlace para renovar. Ese aviso solo tiene sentido si ya hubo una suscripción. En Mi Cuenta, si no hay ninguna, tampoco hay un botón para crearla.

## What Changes

- El banner global de suscripción vencida solo se muestra si existe al menos una fila en `subscriptions` para ese usuario y ninguna está activa.
- Si no hay ninguna fila, el banner no se muestra.
- Si hay una suscripción activa, el banner no se muestra.
- En Mi Cuenta, si no hay ninguna fila, el bloque de suscripciones muestra el botón «Crear suscripción» hacia `/subscription`.
- Si ya hay al menos una fila, ese botón no se muestra. Quien tiene la suscripción vencida sigue renovando por el banner y `/billing/renew`.

## Capabilities

### New Capabilities

Ninguna. El comportamiento nuevo se añade al spec de suscripciones.

### Modified Capabilities

- `subscriptions`: RF-6 deja de tratar «sin filas» como «suscripción vencida». Se añaden el banner solo con historial y el botón Crear suscripción en Mi Cuenta.

## Impact

- Banner global: `src/app/(public)/layout.tsx`, `src/components/SubscriptionExpiredBanner.tsx`.
- Estado ya calculado: `src/lib/subscriptions.ts` (`hasAnySubscription`, `isActiveSubscription`).
- Mi Cuenta: `src/app/(public)/account/page.tsx`.
- Textos nuevos en el i18n propio (es, en, ca). El destino del botón es `/subscription`, no `/billing/renew`.
- El panel (`/dashboard`) ya separa «nunca suscrito» de «inactiva»; este change no cambia esas reglas.
- El aviso de caducidad próxima (RF-7) y el criterio de suscripción activa no cambian.
