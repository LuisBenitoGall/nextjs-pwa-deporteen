## Context

El layout público (`src/app/(public)/layout.tsx`) llama a `getSubscriptionState`. Esa función ya devuelve `hasAnySubscription` (hay al menos una fila de `subscriptions` para el `user_id`) e `isActiveSubscription` (la más reciente según `isSubscriptionActive`). El banner solo mira `isActiveSubscription`: si es falso, muestra «Tu suscripción ha vencido» y el enlace a `/billing/renew`. Un usuario sin filas cae en ese caso.

En `/account`, el bloque de suscripciones pinta `suscripciones_no_registradas` cuando la lista está vacía. No hay botón. El panel (`/dashboard`) ya distingue «ninguna fila» de «hubo alguna y ahora no está activa». El aviso de caducidad próxima (RF-7) es otro componente y solo sale con una fila activa dentro de la ventana de días.

## Goals / Non-Goals

**Goals:**

- Ocultar el banner de vencida si no hay ninguna fila en `subscriptions`.
- Mostrarlo solo si hay al menos una fila y ninguna está activa, con la acción de renovar que ya existe.
- En Mi Cuenta, botón «Crear suscripción» hacia `/subscription` cuando no hay ninguna fila, y no mostrarlo si ya hay alguna.

**Non-Goals:**

- Rediseñar `/subscription` ni `/billing/renew`.
- Cambiar el aviso de caducidad próxima de `/dashboard` y `/account`.
- Cambiar el criterio de suscripción activa.
- Mezclar la suscripción de almacenamiento (R2 / Drive) con la de producto.
- Cambiar las reglas del panel.
- Crear un alta nuevo.

## Decisions

1. **El banner usa las dos señales que ya devuelve `getSubscriptionState`.** Se muestra solo si `hasAnySubscription` es verdadero y `isActiveSubscription` es falso. Alternativa descartada: otra consulta en el layout. La función ya cuenta las filas.

2. **«Nunca ha tenido suscripción» es cero filas en `subscriptions`.** Incluye a quien entra muchas veces sin suscribirse. Una fila de código de acceso cuenta como historial, igual que RF-6. No se distingue Stripe y código.

3. **El botón vive en el bloque de suscripciones de `/account`, solo con cero filas.** El texto vacío puede quedarse. El botón es un enlace a `/subscription`, el mismo alta que usa el panel. No apunta a `/billing/renew`. Quien ya tiene filas, activas o vencidas, no ve este botón.

4. **Texto nuevo, no la clave `suscribirme`.** El brief pide «Crear suscripción» en es, en y ca. `suscribirme` dice «Suscribirme». Clave nueva en `src/i18n/messages/{es,en,ca}/core.json`.

5. **El enlace y el texto del banner de vencida no cambian** para quien sí tuvo suscripción: mismo componente, «Renovar ahora», `/billing/renew`.

## Risks / Trade-offs

- [Usuario sin filas deja de ver un aviso global] → Es el caso que el brief corrige. El alta queda en Mi Cuenta y, como ya está, en el panel.
- [Una fila de código cuenta como historial] → Si el código venció, verá el banner de renovar y no el botón de crear. Coincide con RF-6 (existencia = una o más filas).
- [El texto vacío y el botón conviven] → El brief pide el botón; no pide quitar `suscripciones_no_registradas`.

## Migration Plan

No hay migración de datos ni de variables de entorno. Rollback: volver a mostrar el banner solo con `isActiveSubscription` falso y quitar el botón de Mi Cuenta.

## Open Questions

Ninguna. El brief cierra el significado de «primera vez» y el destino del botón.
