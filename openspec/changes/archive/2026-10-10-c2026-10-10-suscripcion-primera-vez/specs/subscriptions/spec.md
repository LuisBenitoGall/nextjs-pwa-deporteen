## ADDED Requirements

### Requirement: Banner de suscripción vencida solo con historial
El banner global «Tu suscripción ha vencido» MUST mostrarse solo si el usuario ya tuvo alguna suscripción y ahora no tiene ninguna activa. MUST NOT mostrarse si no existe ninguna fila en `subscriptions` para ese usuario. MUST NOT mostrarse si tiene una suscripción activa.

#### Scenario: Usuario sin ninguna suscripción
- **WHEN** el usuario autenticado no tiene ninguna fila en `subscriptions`
- **THEN** el banner «Tu suscripción ha vencido» no se muestra

#### Scenario: Suscripción anterior ya no activa
- **WHEN** el usuario tiene al menos una fila en `subscriptions` y ninguna está activa
- **THEN** el banner «Tu suscripción ha vencido» se muestra, con la acción de renovar que ya existe

#### Scenario: Suscripción activa
- **WHEN** el usuario tiene una suscripción activa
- **THEN** el banner «Tu suscripción ha vencido» no se muestra

---

### Requirement: Botón Crear suscripción en Mi Cuenta
En Mi Cuenta, si el usuario no tiene ninguna fila en `subscriptions`, el bloque de suscripciones MUST mostrar el botón Crear suscripción. Ese botón MUST enlazar al alta ya existente en `/subscription`. Si el usuario tiene al menos una fila, el botón MUST NOT mostrarse.

#### Scenario: Sin suscripciones
- **WHEN** el usuario abre Mi Cuenta y no tiene ninguna fila en `subscriptions`
- **THEN** en el bloque de suscripciones aparece el botón Crear suscripción, y lleva al alta ya existente en `/subscription`

#### Scenario: Ya hubo alguna suscripción
- **WHEN** el usuario abre Mi Cuenta y tiene al menos una fila en `subscriptions`
- **THEN** el botón Crear suscripción no se muestra

## MODIFIED Requirements

### Requirement: RF-6: Verificar Estado de Suscripción
El sistema verifica el estado de suscripción antes de permitir acciones premium.

Criterios que este cambio no retira:
- La verificación sigue en crear partidos, crear competiciones y el acceso a funciones premium.
- Existe suscripción si hay al menos una fila en `subscriptions`.
- Está activa si `status` es `active` o `trialing` y (`current_period_end` es null o es posterior a ahora).

La ausencia de suscripción activa no se comunica igual si el usuario nunca tuvo una fila que si ya tuvo alguna y venció. El mensaje de vencida queda reservado al segundo caso.

#### Scenario: Sin filas no es una suscripción vencida
- **WHEN** no existe ninguna fila en `subscriptions` para el usuario
- **THEN** la interfaz no le dice que su suscripción ha vencido
