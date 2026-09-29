## ADDED Requirements

### Requirement: Gestión administrativa de estado y vigencia

En contexto Admin, el sistema MUST permitir modificar estado y fecha de fin de una suscripción existente sin alterar el flujo de autoservicio del usuario final.

#### Scenario: Admin actualiza estado de suscripción
- **WHEN** un administrador autorizado actualiza el estado de una suscripción desde la vista dedicada de edición
- **THEN** el sistema MUST persistir el nuevo estado en la entidad administrativa correspondiente
- **AND** el nuevo estado MUST ser utilizado por el listado admin

#### Scenario: Admin actualiza `current_period_end`
- **WHEN** un administrador autorizado modifica la fecha de fin de una suscripción
- **THEN** el sistema MUST validar y persistir la nueva vigencia
- **AND** la modificación MUST quedar trazable mediante `updated_at`

---

### Requirement: Consulta de histórico de pagos en operación administrativa

La gestión administrativa de suscripciones MUST incluir acceso al histórico de pagos vinculado a la suscripción o, cuando no exista vinculación directa, al conjunto de pagos atribuible según criterio documentado.

#### Scenario: Histórico disponible para auditoría administrativa
- **WHEN** un administrador abre la edición de una suscripción
- **THEN** el sistema MUST mostrar histórico de pagos con datos mínimos de auditoría (fecha, importe, estado, referencia)
- **AND** la ausencia de pagos MUST mostrarse de forma explícita

---

### Requirement: Validación de campos editables en API admin

Los endpoints administrativos de suscripciones MUST validar whitelist de campos y catálogo de valores permitidos para proteger integridad de datos.

#### Scenario: Campo editable permitido
- **WHEN** el admin envía actualización de un campo permitido (estado, fecha fin, plan o capacidad según contrato vigente)
- **THEN** el backend MUST aplicar el cambio y devolver respuesta de éxito

#### Scenario: Campo o valor no permitido
- **WHEN** el admin envía un campo no permitido o valor inválido
- **THEN** el backend MUST devolver error de validación y no persistir cambios inconsistentes
