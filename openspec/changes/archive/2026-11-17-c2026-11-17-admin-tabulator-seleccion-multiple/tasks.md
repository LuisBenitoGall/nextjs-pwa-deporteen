# Tasks

## 1. Selección acumulable y cabecera activa

- [x] 1.1 En `AdminTabulatorTable`, quitar `selectableRowsRangeMode: 'click'` y no asignar otro modo. Verificar en `/admin/usuarios` como superadmin que marcar la fila A y luego la B deja las dos y el botón muestra `(2)`; desmarcar B deja solo A; desmarcar A oculta el botón; pulsar el cuerpo de otra fila no reduce la selección a esa sola fila.
- [x] 1.2 Añadir `titleFormatterParams: { rowRange: 'active' }` a la columna `rowSelection`. Verificar, sin filtros, que el primer click de cabecera marca las filas cargadas de otras páginas y el segundo deja cero; con selección parcial, otro click de cabecera limpia todo y no completa el resto.

## 2. Cabecera visual y filtros

- [x] 2.1 Tras `rowSelectionChanged` y `dataFiltered`, alinear checked e indeterminate del checkbox de cabecera con las filas activas (ajuste al final del evento; `queueMicrotask` solo si Tabulator lo pisa en el mismo turno). Verificar que una selección parcial queda indeterminate, que marcar todas las activas queda checked, y que con un filtro que oculta filas el checked aparece cuando todas las visibles están marcadas.
- [x] 2.2 En `dataFiltered`, deseleccionar las filas seleccionadas que ya no estén activas. Verificar que el recuento del botón baja al ocultar una fila marcada y que cambiar de página local no pierde las filas marcadas. No ejecutar el borrado.

## 3. Alcance del componente compartido

- [x] 3.1 No editar `UsersTable` ni los demás llamadores. Verificar con el diff que el único archivo de aplicación tocado es `src/components/admin/shared/AdminTabulatorTable.tsx`, que `selectable={canMutate}` sigue en usuarios, y que jugadores, partidos, competiciones, suscripciones y cupones conservan su `onBulkAction`.
- [x] 3.2 Repetir el marcado de dos filas en el listado de jugadores. Verificar que se acumulan igual y que el botón de lote de esa tabla sigue recibiendo el array seleccionado. Comprobar en código que un admin que no es superadmin sigue sin columna de selección en usuarios porque `selectable` no se monta.

## 4. Cierre de la entrega

- [x] 4.1 Ejecutar `pnpm lint`, `pnpm types` y `pnpm test:run` y verificar que terminan sin errores nuevos atribuibles a este change.

## Workflow follow-up

- Revisar los artefactos y aplicar el change con `openspec-apply-change` cuando se pida implementación.
- Archivar el change cuando la revisión del proyecto lo pida, y comprobar el spec archivado en `openspec/specs/admin-tabulator-selection/spec.md`.
