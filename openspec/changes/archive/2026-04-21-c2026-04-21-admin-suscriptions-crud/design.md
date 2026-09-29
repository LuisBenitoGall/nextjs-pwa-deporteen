## Context

El módulo actual de suscripciones en Admin ya tiene un listado funcional (`/admin/suscripciones`) y edición parcial mediante modal (`EditSubscriptionDialog`) contra `PATCH /api/admin/suscripciones`, además de borrado. Sin embargo, el contrato funcional sigue incompleto para el objetivo operativo: gestionar suscripciones activas e inactivas de forma explícita, navegar a una edición dedicada y consultar en la misma vista el histórico de pagos asociado.

Estado actual relevante:
- Carga desde `storage_subscriptions` + `storage_plans` + `profiles` en `src/app/admin/suscripciones/page.tsx`.
- Tabla Tabulator con columna `Estado` y `Acciones` alineadas a la derecha en `src/components/admin/suscripciones/SubscriptionsTable.tsx`.
- API admin de suscripciones con `GET/PATCH/DELETE` en `src/app/api/admin/suscripciones/route.ts`.
- No existe hoy una página dedicada de edición (se usa diálogo modal).

Restricciones:
- Mantener control de acceso admin (`requireAdmin` / `adminGuard`).
- Evitar romper el flujo de suscripción del usuario final (frontend público y lógica Stripe de cliente).
- Definir de forma explícita la fuente del histórico de pagos (tabla local y/o Stripe).

## Goals / Non-Goals

**Goals:**
- Definir un flujo de gestión admin completo para suscripciones (listado total + edición dedicada).
- Estandarizar cómo se representa el estado (activo/inactivo/expirado/cancelado) y cómo se actualiza.
- Incorporar en edición la modificación de fecha de fin y visibilidad del histórico de pagos.
- Mantener acciones en tabla con alineación derecha y CTA de edición consistente.

**Non-Goals:**
- No rediseñar otras secciones de Admin fuera de suscripciones.
- No rehacer el modelo de facturación de Stripe.
- No introducir nuevas dependencias de UI.
- No migrar todas las tablas al nuevo patrón de navegación si no son de suscripciones.

## Decisions

### 1) Navegación a edición dedicada (ruta) en lugar de modal como flujo principal

**Decisión:** crear una ruta de edición dedicada bajo `src/app/admin/suscripciones/[id]/page.tsx` y usarla como destino del botón editar de la columna `Acciones`.

**Rationale:**
- Permite mostrar más información (incluido histórico de pagos) sin sobrecargar un diálogo.
- Mejora trazabilidad y posibilidad de compartir/debuggear URLs.
- Encaja mejor con requisitos de auditoría administrativa.

**Alternativas evaluadas:**
- Mantener solo modal y extenderlo: más rápido, pero peor para densidad de datos y navegación.
- Doble vía (modal + página): incrementa complejidad y duplicidad de estado.

### 2) Mantener listado “all statuses” por defecto y estado explícito en columna

**Decisión:** el listado seguirá cargando por defecto todas las suscripciones disponibles en `storage_subscriptions` sin filtro inicial por estado; la columna `Estado` será la fuente visible de situación.

**Rationale:**
- Cumple requisito de no ocultar inactivas.
- Evita falsa percepción de datos incompletos.
- Ya es compatible con consulta actual (`order created_at` sin `eq(status)`).

### 3) Contrato de actualización acotado y validado en API

**Decisión:** `PATCH /api/admin/suscripciones` seguirá siendo el punto de actualización de la suscripción y validará explícitamente campos editables de admin:
- `status`
- `current_period_end`
- `plan_id`
- `gb_amount` (si procede por contrato de storage_subscriptions)

Se recomienda validar whitelist de estados permitidos y formato de fecha antes de persistir.

**Rationale:**
- Mantiene endpoint existente y minimiza ruptura.
- Evita escribir campos no deseados desde cliente admin.

### 4) Histórico de pagos: fuente canónica y fallback

**Decisión:** la vista dedicada mostrará histórico desde la fuente de pagos administrativa disponible (tabla local de pagos relacionada al usuario/suscripción) y, si falta granularidad por suscripción, documentar fallback por usuario con indicador de alcance.

**Rationale:**
- El requisito exige histórico en edición.
- El diseño debe explicitar trazabilidad: qué pagos corresponden exactamente a la suscripción editada.

**Alternativas:**
- Consumir Stripe en tiempo real para todo: más exactitud, pero mayor latencia/complexidad.
- Solo datos locales: más rápido, pero puede quedar incompleto si no está bien sincronizado.

### 5) Acciones de tabla y consistencia visual

**Decisión:** mantener columna `Acciones` con alineación derecha (`hozAlign: 'right'`) y botones consistentes; añadir/asegurar botón editar como acción principal.

**Rationale:**
- Ya está parcialmente implementado; formalizarlo evita regresiones en futuras refactorizaciones.

## Risks / Trade-offs

- **[Riesgo] Divergencia de estados entre storage_subscriptions y lógica Stripe** → **Mitigación:** definir mapping de estado aceptado en admin y mostrar etiqueta clara cuando el estado provenga de sincronización pendiente.
- **[Riesgo] Histórico de pagos ambiguo por no tener FK directa a suscripción** → **Mitigación:** documentar criterio de vinculación (subscription_id > user_id+fecha) y mostrar aviso si el dato es agregado.
- **[Trade-off] Página dedicada incrementa navegación** → **Mitigación:** mantener acceso rápido desde tabla y breadcrumb/volver al listado.
- **[Riesgo] Cambios de API sin validación robusta** → **Mitigación:** validar payload en server (campos, tipos, valores permitidos) y respuestas de error tipificadas.

## Migration Plan

1. Definir spec delta (admin + subscriptions + capability nueva) con escenarios cerrados.
2. Diseñar estructura de ruta de edición dedicada y contrato de datos (detalle + pagos).
3. Ajustar tabla de suscripciones para navegación a edición dedicada desde `Acciones`.
4. Ajustar endpoint(s) admin para soportar el detalle/actualización con validaciones.
5. Verificación:
   - listado incluye activas e inactivas
   - estado visible correcto
   - botones de acciones alineados a la derecha
   - edición guarda estado y fecha fin
   - histórico de pagos visible

Rollback:
- Revertir cambios de ruta/tabla/API del módulo admin de suscripciones sin impacto en frontend público.

## Open Questions

- Fuente definitiva del histórico de pagos por suscripción: ¿existe relación directa con `storage_subscriptions.id` o hay que resolver por `user_id` + ventanas temporales?
- ¿La edición permitirá solo `active/cancelled/expired` o también otros estados internos?
- ¿Debe mantenerse `EditSubscriptionDialog` como fallback temporal o retirarse tras introducir la página dedicada?
