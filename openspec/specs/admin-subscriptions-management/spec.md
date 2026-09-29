# Admin Subscriptions Management

Capacidad para operar suscripciones desde el panel de administración con una vista dedicada de edición, histórico de pagos e integridad de datos en backend.

## Requisitos

### Requirement: Vista dedicada de edición de suscripción en Admin

El sistema MUST ofrecer una vista dedicada de edición para cada suscripción en el entorno Admin (ruta bajo `/admin/suscripciones/[id]`) en lugar de depender únicamente de un modal, permitiendo revisar y editar datos clave de la suscripción con contexto suficiente para operaciones administrativas.

#### Scenario: Navegación a edición desde el listado
- **WHEN** un administrador pulsa el botón de editar en la columna `Acciones` de una fila del listado de suscripciones
- **THEN** el sistema MUST navegar a una vista dedicada de edición de esa suscripción
- **AND** la vista MUST cargar los datos de la suscripción seleccionada antes de habilitar guardado

#### Scenario: Carga inválida de suscripción
- **WHEN** el administrador accede a una suscripción inexistente o sin permisos válidos de admin
- **THEN** el sistema MUST mostrar respuesta de error controlada (not found o acceso denegado) sin exponer detalles sensibles

### Requirement: Formulario administrativo de estado y vigencia

La vista dedicada MUST incluir un formulario para gestionar estado y vigencia de la suscripción, con persistencia en backend administrativo.

#### Scenario: Activar o desactivar suscripción
- **WHEN** el administrador cambia el estado de la suscripción (p. ej. activa/inactiva/expirada/cancelada según catálogo permitido) y confirma guardado
- **THEN** el sistema MUST persistir el nuevo estado
- **AND** el cambio MUST reflejarse en el listado al volver o refrescar

#### Scenario: Modificar fecha fin
- **WHEN** el administrador actualiza `current_period_end` y guarda
- **THEN** el sistema MUST persistir la nueva fecha de fin con formato válido
- **AND** la columna de vencimiento del listado MUST mostrar el valor actualizado

### Requirement: Histórico de pagos en contexto de edición

La vista dedicada MUST mostrar el histórico de pagos relacionado con la suscripción editada, incluyendo datos mínimos para auditoría funcional.

#### Scenario: Visualización de histórico
- **WHEN** la vista de edición carga correctamente
- **THEN** el sistema MUST mostrar un bloque de histórico con al menos fecha, importe, estado y referencia de pago
- **AND** si no hay pagos asociados, MUST mostrar estado vacío explícito

#### Scenario: Trazabilidad de fuente de datos
- **WHEN** la relación de pagos no sea 1:1 directa por `subscription_id`
- **THEN** el sistema MUST aplicar el criterio documentado por diseño (p. ej. por `user_id` y período) y señalar alcance para evitar interpretaciones ambiguas

### Requirement: Integridad de edición administrativa

El backend de edición admin MUST aceptar solo campos permitidos y validar tipos/valores para evitar escrituras inconsistentes.

#### Scenario: Payload con campos no permitidos
- **WHEN** el cliente envía campos fuera de la whitelist de edición
- **THEN** el backend MUST ignorarlos o rechazarlos explícitamente según política definida

#### Scenario: Valor inválido de estado o fecha
- **WHEN** el payload contiene un estado no soportado o fecha inválida
- **THEN** el backend MUST devolver error de validación y no aplicar cambios parciales silenciosos
