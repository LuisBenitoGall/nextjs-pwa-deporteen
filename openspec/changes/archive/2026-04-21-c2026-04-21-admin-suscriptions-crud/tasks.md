## 1. Preparar contrato de datos admin de suscripciones

- [x] 1.1 Revisar y documentar en código la fuente del histórico de pagos para edición (`subscription_id` directo o fallback por `user_id` + período).
- [x] 1.2 Definir catálogo permitido de estados editables en Admin y normalizar su mapping de etiquetas en UI.
- [x] 1.3 Confirmar campos editables finales del `PATCH /api/admin/suscripciones` (`status`, `current_period_end`, `plan_id`, `gb_amount`) y sus validaciones de tipo/formato.

## 2. Implementar navegación y listado admin

- [x] 2.1 Actualizar la columna `Acciones` en `src/components/admin/suscripciones/SubscriptionsTable.tsx` para que el botón editar navegue a la ruta dedicada de edición.
- [x] 2.2 Mantener los botones de `Acciones` alineados a la derecha y verificar que el listado siga mostrando suscripciones activas e inactivas sin filtro inicial por estado.
- [x] 2.3 Asegurar que la columna `Estado` represente de forma consistente el estado persistido en cada fila.

## 3. Crear vista dedicada de edición de suscripción

- [x] 3.1 Crear `src/app/admin/suscripciones/[id]/page.tsx` con control de acceso admin y carga de datos de la suscripción.
- [x] 3.2 Implementar formulario de edición para estado y fecha fin (`current_period_end`) con feedback de guardado y manejo de errores.
- [x] 3.3 Incluir en la vista el bloque de histórico de pagos con estado vacío explícito cuando no existan registros.
- [x] 3.4 Añadir navegación de retorno al listado (`/admin/suscripciones`) y estados de error para suscripción inexistente o acceso denegado.

## 4. Endurecer backend de administración

- [x] 4.1 Actualizar `src/app/api/admin/suscripciones/route.ts` para validar whitelist de campos y rechazar valores inválidos de estado/fecha.
- [x] 4.2 Garantizar respuestas de error tipificadas para payload inválido y evitar persistencias parciales silenciosas.
- [x] 4.3 Verificar que `updated_at` y cambios de estado/vigencia queden trazables tras cada edición.

## 5. Verificar funcionalidad end-to-end y cerrar change

- [x] 5.1 Probar manualmente: listado con activas/inactivas, estado visible, acciones alineadas y navegación a edición dedicada.
- [x] 5.2 Probar guardado de estado y fecha fin desde la vista dedicada, confirmando reflejo en listado tras refresco/retorno.
- [x] 5.3 Probar render del histórico de pagos (con y sin datos) y validar mensajes de estado vacío.
- [x] 5.4 Ejecutar checks de calidad aplicables (`pnpm lint`, `pnpm test` o subset relevante) y registrar incidencias.
- [x] 5.5 Actualizar estado de tareas del change en OpenSpec y dejarlo listo para `/opsx:apply`.
