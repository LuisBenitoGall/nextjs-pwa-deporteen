# admin-tabulator-selection Specification

## Purpose

Permite al administrador marcar varias filas en los listados del panel que ofrecen selección, para que la acción de lote actúe sobre ese conjunto y no sobre una sola fila.

## Requirements

### Requirement: Selección múltiple acumulable por fila
En los listados admin que muestran columna de selección, el sistema SHALL permitir marcar varias filas a la vez. La identidad de fila SHALL ser su id. Marcar una fila SHALL añadirla al conjunto y desmarcarla SHALL quitar solo esa, sin teclas modificadoras.

#### Scenario: Marcar dos filas seguidas
- **WHEN** un administrador marca la fila A y después la fila B en el listado de usuarios
- **THEN** A y B quedan seleccionadas
- **AND** el botón de lote muestra el recuento 2

#### Scenario: Desmarcar una de varias
- **WHEN** A y B están seleccionadas y el administrador desmarca B
- **THEN** solo A sigue seleccionada
- **AND** al desmarcar A el botón de lote deja de mostrarse

#### Scenario: Pulsar el cuerpo de otra fila
- **WHEN** hay varias filas seleccionadas y el administrador pulsa el cuerpo de otra fila, fuera de sus acciones de editar o eliminar
- **THEN** la selección previa no queda reducida a esa sola fila

#### Scenario: Misma regla en el resto de listados con selección
- **WHEN** el administrador marca filas en los listados de jugadores, partidos, competiciones, suscripciones o cupones
- **THEN** la selección se acumula igual que en usuarios
- **AND** la acción de lote de ese listado recibe las filas seleccionadas, sin cambiar el contrato de esa acción

### Requirement: Cabecera sobre filas activas
El checkbox de cabecera SHALL actuar sobre las filas activas: las que pasan los filtros de cabecera, en todas las páginas del listado local. SHALL NOT limitarse a la página visible ni incluir filas ocultas por un filtro. Sin filtros, las filas activas SHALL ser todas las filas cargadas en el listado.

#### Scenario: Seleccionar todas las cargadas
- **WHEN** no hay filtro de cabecera, no hay ninguna fila marcada y el administrador pulsa el checkbox de cabecera
- **THEN** quedan marcadas todas las filas cargadas, también las de otras páginas
- **AND** un segundo click deja la selección a cero

#### Scenario: Selección parcial
- **WHEN** hay al menos una fila marcada y no están marcadas todas las activas
- **THEN** la cabecera queda en estado indeterminado
- **AND** otro click en la cabecera limpia toda la selección y no completa el resto

#### Scenario: Filtro de cabecera al seleccionar todas
- **WHEN** un filtro de cabecera oculta parte de las filas y el administrador pulsa el checkbox de cabecera sin ninguna marcada
- **THEN** solo quedan marcadas las filas que pasan el filtro
- **AND** el contador del botón de lote no incluye filas ocultas

#### Scenario: Filtrar con filas ya marcadas
- **WHEN** una fila estaba marcada y un filtro de cabecera deja de mostrarla
- **THEN** esa fila sale de la selección
- **AND** el número del botón coincide con las filas que recibirá la acción de lote

#### Scenario: Cambio de página
- **WHEN** el administrador cambia de página del listado local con filas ya marcadas
- **THEN** esas filas siguen seleccionadas

### Requirement: Visibilidad de la selección según el permiso ya existente
El sistema SHALL mostrar la columna de selección y el botón de lote solo en los listados que ya ofrecen selección. En el listado de usuarios esa oferta SHALL seguir limitada al superadmin.

#### Scenario: Admin sin permiso de mutación
- **WHEN** un administrador que no es superadmin abre el listado de usuarios
- **THEN** no ve la columna de selección ni el botón de lote
