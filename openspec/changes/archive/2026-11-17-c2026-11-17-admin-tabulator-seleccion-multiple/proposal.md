## Why

En las tablas admin el checkbox de fila solo deja una selección: al marcar otra, la anterior se desmarca. “Seleccionar todos” sí marca varias filas porque no pasa por el mismo camino. Un superadmin no puede elegir a mano el lote que va a borrar.

## What Changes

- La selección de fila pasa a ser acumulable por `id`, sin Shift, Ctrl ni Cmd.
- El checkbox de cabecera actúa sobre las filas activas: las que pasan los filtros de cabecera, en todas las páginas de la paginación local.
- Con selección parcial la cabecera queda indeterminada; otro click limpia todo y no completa el resto.
- Un filtro que oculta una fila marcada la saca de la selección, para que el botón de lote no cuente filas que no va a recibir.
- El arreglo vive en el componente compartido. Usuarios, jugadores, partidos, competiciones, suscripciones y cupones heredan el mismo comportamiento y conservan su acción de lote actual.
- Quién ve los checkbox no cambia: en usuarios solo el superadmin.

## Capabilities

### New Capabilities

- `admin-tabulator-selection`: selección múltiple de filas en las tablas admin que usan `AdminTabulatorTable` con `selectable`, incluida la cabecera sobre filas activas y el permiso de visibilidad ya existente.

### Modified Capabilities

- Ninguna. `admin-tabulator-ui` sigue siendo solo presentación. `admin` no cubre este listado.

## Impact

- `src/components/admin/shared/AdminTabulatorTable.tsx` (modo de rango, cabecera, estado checked/indeterminate, filas que dejan de estar activas).
- Tablas que ya pasan `selectable`: usuarios, jugadores, partidos, competiciones, suscripciones, cupones. Sin cambio de sus `onBulkAction` ni de los endpoints de borrado.
- Sin migraciones, sin Stripe, sin i18n nuevo, sin cambio de exportaciones XLS/PDF ni del tope de carga (`perPage: 1000`, página local de 25).
