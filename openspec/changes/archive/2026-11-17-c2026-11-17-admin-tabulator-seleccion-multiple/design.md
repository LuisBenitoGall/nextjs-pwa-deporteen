# Design

## Context

La selección vive en Tabulator, no en un `useState` de un solo id. `AdminTabulatorTable` copia en `selectedRows` el array que llega en `rowSelectionChanged` y, si hay filas y `onBulkAction`, muestra el botón con ese recuento. La columna de checkbox solo se monta cuando la prop `selectable` es verdadera. En usuarios eso es `canMutate` (superadmin). El índice de fila sigue siendo `id`.

Hoy las opciones fijan `selectableRowsRangeMode: 'click'`. Con ese modo, el click del checkbox de fila entra en `handleComplexRowClick`: sin Shift ni Ctrl, Tabulator vacía la selección y deja solo esa fila. El checkbox de cabecera no usa ese camino: si no hay nada marcado llama a `selectRow(rowRange)` y si ya hay alguna fila llama a `deselectRow()`. Por eso “seleccionar todos” sí marca varias.

El default de Tabulator para `selectableRowsRangeMode` es `drag`. En ese modo el `change` del checkbox hace `toggleSelect()` y el click de la fila hace `toggleRow` de esa fila, sin sustituir el conjunto. El checkbox de fila ya hace `stopPropagation`, así que no dispara el click de la fila.

La cabecera nativa compara `selectedRows.length` con `rowManager.rows.length` (todas las filas cargadas). Con un filtro, “todas las activas” puede quedarse en indeterminado. `rowRange: 'active'` solo afecta a qué filas selecciona el click de cabecera, no a esa comparación.

`dataFiltered` entrega las filas activas tras cada filtro de cabecera. `replaceData` (el efecto que sincroniza `data`) dispara `data-refreshing` y Tabulator deselecciona todo. Un `router.refresh()` limpia la selección; un click de checkbox no cambia `data`.

## Goals / Non-Goals

**Goals:**

- Dejar la selección acumulable en el componente compartido, para todos los llamadores que ya pasan `selectable`.
- Hacer que la cabecera y su estado visual usen las filas activas.
- Sacar de la selección las filas que un filtro deja de mostrar, antes de que el botón de lote las cuente.

**Non-Goals:**

- No cambiar `UsersTable`, los `onBulkAction` ni los endpoints de borrado.
- No añadir confirmación ni rollback al lote.
- No cambiar el índice, la paginación local (25), el tope de carga ni las exportaciones.
- No dar `selectable` a tablas que hoy no lo reciben (payment links, invoices, storage plans, suscripciones Stripe).
- No conservar la selección tras `replaceData` / `router.refresh()`.

## Decisions

### 1. Quitar el modo `click` y no fijar otro

Se elimina `selectableRowsRangeMode: 'click'` y no se asigna otro valor. Queda el default `drag`.

El checkbox de fila vuelve a `toggleSelect()` y no llama a `handleComplexRowClick`. El click en el cuerpo de la fila alterna solo esa fila. Shift+arrastre, que es el rango del modo `drag`, puede seguir existiendo; no es el contrato de los checkbox y no hay que desactivarlo.

Alternativa descartada: dejar `click` e interceptar el evento del checkbox en React. El formatter es de Tabulator y el click ya está cableado dentro de la librería; parchear el DOM después sería más frágil que quitar la opción que activa ese camino.

### 2. La cabecera selecciona `active`

En la columna `rowSelection`, `titleFormatterParams: { rowRange: 'active' }`.

Sin filas marcadas, el click de cabecera llama a `selectRow('active')`: filas que pasan los filtros de cabecera, en todas las páginas locales. Con alguna fila marcada, el mismo click llama a `deselectRow()` sin argumentos y vacía toda la selección, también en estado indeterminado. No hace falta un handler propio para “completar el resto”: el comportamiento nativo ya limpia.

Alternativa descartada: seleccionar solo la página visible (`rowRange: 'visible'`). El contrato es el conjunto activo completo, no las 25 de la página.

### 3. `selectedRows` sigue siendo el array del evento

No se reduce a un id ni se reconstruye la selección en React. El botón de lote sigue pasando ese array a `onBulkAction`.

### 4. El estado visual de la cabecera se alinea con las filas activas

Tras `rowSelectionChanged` y tras `dataFiltered`, el checkbox de cabecera se ajusta así:

- ninguna activa marcada: unchecked, no indeterminate
- todas las activas marcadas: checked
- alguna activa marcada y no todas: indeterminate

La comparación nativa (`selectedRows.length === rowManager.rows.length`) se deja para el caso sin filtro, donde activas y cargadas coinciden. Con filtro hay que corregirla en el header, sin mover la selección a React. El elemento es el input que registra `registerHeaderSelectCheckbox`; se localiza en la cabecera de la columna de selección.

### 5. Un filtro saca de la selección las filas que oculta

En `dataFiltered`, cada fila seleccionada que no esté en el conjunto activo se deselecciona con la API de la fila (`deselect`). Así `rowSelectionChanged` actualiza `selectedRows` y el recuento del botón coincide con lo que recibirá `onBulkAction`.

No se deselecciona al cambiar de página. La paginación local no pasa por `dataFiltered` como un filtro: las filas de otras páginas siguen activas y seleccionadas.

### 6. Sin cambio de permiso ni de índice

`selectable` sigue decidiendo si existe la columna. No se añade `index`. `id` ya es único en estos listados.

## Risks / Trade-offs

- [La cabecera nativa pisa checked/indeterminate en el mismo turno que nuestro ajuste] → Aplicar el ajuste al final de `rowSelectionChanged` y de `dataFiltered`, después de que Tabulator haya escrito el suyo. Si aun así pierde, el ajuste va en un `queueMicrotask` acotado a ese input, no en un observer permanente.
- [“Seleccionar todos” no es toda la plataforma] → El listado de usuarios carga como máximo 1000 filas. El contrato habla de filas cargadas, no de un segundo fetch. No se cambia ese tope.
- [`replaceData` borra la selección] → Comportamiento actual de Tabulator en `data-refreshing`. Un refresco tras borrar ya vacía la tabla. No se activa `selectableRowsPersistence`.
- [Ids duplicados] → Tabulator trataría dos filas con el mismo `id` como la misma. No se espera en estos listados; no se añade otro índice.
- [Shift+arrastre marca un rango] → Efecto del default `drag`. Los checkbox no lo necesitan. No se bloquea el rango para no reintroducir un modo propio.
- [El lote sigue sin confirmación y un DELETE a medias muestra éxito] → Fuera de este change. El botón recibe el mismo array de siempre, ya sin filas ocultas por filtro.

## Migration Plan

Cambio solo de cliente, en un componente. No hay migración de datos ni variable de entorno. El despliegue es el del frontend. Para revertir, se restaura `selectableRowsRangeMode: 'click'` y se quitan el `rowRange` y los dos ajustes de cabecera y filtro.

## Open Questions

Ninguna. El alcance de la cabecera (filas activas, todas las páginas locales, segundo click limpia) queda cerrado en las decisiones 2, 4 y 5.
