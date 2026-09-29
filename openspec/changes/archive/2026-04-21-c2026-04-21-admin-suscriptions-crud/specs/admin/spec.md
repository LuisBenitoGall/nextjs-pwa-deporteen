## ADDED Requirements

### Requirement: Listado administrativo de suscripciones completo y consistente

El panel Admin MUST incluir en `/admin/suscripciones` un listado que cargue suscripciones activas e inactivas por defecto, mostrando estado explícito por fila y acciones administrativas coherentes con la operación diaria.

#### Scenario: Carga de suscripciones sin filtro inicial por estado
- **WHEN** un administrador entra en `/admin/suscripciones`
- **THEN** el sistema MUST mostrar todas las suscripciones disponibles para gestión administrativa, incluyendo activas e inactivas

#### Scenario: Estado visible por fila
- **WHEN** se renderiza la columna `Estado`
- **THEN** cada fila MUST mostrar la situación de la suscripción con etiqueta legible y consistente con el valor persistido

#### Scenario: Acciones alineadas a la derecha con edición
- **WHEN** se renderiza la columna `Acciones`
- **THEN** los botones MUST permanecer alineados a la derecha
- **AND** MUST incluir al menos la acción de editar suscripción
