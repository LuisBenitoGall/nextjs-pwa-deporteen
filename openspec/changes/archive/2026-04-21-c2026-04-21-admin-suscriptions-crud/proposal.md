## Why

El módulo de suscripciones del Admin necesita un contrato más completo: además de listar correctamente suscripciones activas e inactivas con su estado real, debe permitir una edición funcional y trazable desde una vista dedicada. Esto reduce ambiguedades operativas y evita gestión parcial de datos críticos (estado, vencimiento e histórico de pagos).

## What Changes

- Formalizar que el listado de `/admin/suscripciones` carga todas las suscripciones relevantes (activas e inactivas), mostrando estado consistente en la columna `Estado`.
- Definir que la columna `Acciones` mantiene botones alineados a la derecha e incluye, al menos, acción explícita de editar suscripción.
- Añadir el contrato funcional para una vista dedicada de edición de suscripción con formulario para:
  - activar/desactivar (o equivalente de estado),
  - modificar fecha de fin,
  - visualizar/gestionar información de histórico de pagos y metadatos relacionados.
- Aclarar en artefactos de diseño el alcance de datos implicados (`storage_subscriptions`, planes, y fuente del histórico de pagos) y los límites de cambios permitidos desde Admin.

## Capabilities

### New Capabilities
- `admin-subscriptions-management`: Gestión administrativa integral de suscripciones con edición dedicada, estado explícito y trazabilidad de pagos.

### Modified Capabilities
- `admin`: Se amplían requisitos del panel Admin para cubrir listado completo de suscripciones (incluidas inactivas), consistencia visual/funcional de estado y acciones, y navegación a edición dedicada.
- `subscriptions`: Se precisan requisitos de gestión de suscripciones en contexto administrativo (estado, fecha de fin e histórico de pagos), sin alterar el flujo de suscripción del usuario final.

## Impact

- **Código UI/Admin**:
  - `src/app/admin/suscripciones/page.tsx`
  - `src/components/admin/suscripciones/SubscriptionsTable.tsx`
  - nueva ruta/página de edición dedicada bajo `src/app/admin/suscripciones/**`
  - posible reutilización/adaptación de `src/components/admin/suscripciones/EditSubscriptionDialog.tsx`
- **API Admin**:
  - `src/app/api/admin/suscripciones/route.ts`
  - posibles endpoints auxiliares para histórico de pagos si no está cubierto por el contrato actual.
- **Datos/Sistemas**:
  - lectura/escritura sobre `storage_subscriptions` y relación con `storage_plans`
  - integración con fuente de histórico de pagos (a definir en `design.md`: Stripe y/o tabla local).
- **Especificaciones**:
  - nuevo spec de capability para gestión admin de suscripciones
  - delta sobre specs existentes `admin` y `subscriptions`.
