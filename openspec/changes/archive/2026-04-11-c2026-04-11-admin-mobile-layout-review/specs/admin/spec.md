# Delta spec: Panel de Administración (change: c2026-04-11-admin-mobile-layout-review)

Cambios respecto a `openspec/specs/admin/spec.md` para enlazar explícitamente las tablas Tabulator con la capability **`admin-tabulator-ui`**.

## ADDED Requirements

### Requirement: Tablas de datos Tabulator en el panel admin

Las vistas del panel de administración que presenten datos mediante **Tabulator** MUST cumplir la especificación **admin-tabulator-ui** definida para este change (`specs/admin-tabulator-ui/spec.md`), incluyendo coherencia cromática con el shell admin, legibilidad, cabecera/filtros/cuerpo/pie uniformes y ámbito centralizado de estilos.

#### Scenario: Listado con Tabulator en ruta admin

- **WHEN** un usuario administrador accede a cualquier ruta bajo `/admin/**` donde se muestre una tabla construida con Tabulator
- **THEN** la presentación de esa tabla MUST satisfacer todos los requisitos normativos de la spec **admin-tabulator-ui** aplicable a este proyecto
- **AND** MUST NOT quedar excluidas partes de la tabla (cabecera, filtros, columnas sueltas o pie) del conjunto de reglas de coherencia visual

#### Scenario: Consistencia con RF de acceso existentes

- **WHEN** el acceso al panel está permitido según el control de acceso del panel admin (p. ej. verificación de rol admin)
- **THEN** las tablas Tabulator visibles en ese contexto MUST seguir cumpliendo **admin-tabulator-ui** además de los requisitos funcionales ya definidos en la spec principal de admin (Stripe, listados, etc.)
