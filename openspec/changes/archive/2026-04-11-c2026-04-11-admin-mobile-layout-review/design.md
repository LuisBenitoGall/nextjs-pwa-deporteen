# Design: Tabulator unificado en Admin (tema oscuro)

## Context

- El panel admin usa **Next.js App Router**, layout en `src/app/admin/layout.tsx` con fondo `bg-slate-950` y tipografía clara.
- Las tablas se centralizan en **`AdminTabulatorTable`** (`src/components/admin/shared/AdminTabulatorTable.tsx`), que importa **`tabulator-theme.css`** junto con `tabulator-tables/dist/css/tabulator.min.css`.
- Ya existe un tema oscuro detallado en `tabulator-theme.css` (cabecera, filas, celdas, pie, scrollbars). Aun así, en producción/móvil se observa un **efecto “mitad claro / mitad oscuro”**: cabecera y filas con apariencia de tema por defecto de Tabulator en parte de la tabla, mientras otras columnas (p. ej. badges de estado) parecen coherentes con el shell oscuro.
- Hipótesis técnicas (a validar en implementación):
  1. **Orden y especificidad CSS**: reglas del `tabulator.min.css` (fondos blancos / zebra clásica) compiten con los overrides; en algunos navegadores o tras code-splitting, fragmentos del tema por defecto **ganan** en celdas o capas internas (p. ej. `.tabulator-row`, contenedores internos de columnas).
  2. **Ámbito insuficiente**: los selectores globales `.tabulator-*` pueden **chocar** con estilos globales de la app o quedar **parcialmente anulados** si otra hoja se carga después.
  3. **Columnas / layout**: `layout: 'fitColumns'` y anchos mínimos en móvil pueden generar **sub-estructuras DOM** (p. ej. tablas anidadas o celdas con fondo propio) que el tema actual no cubre al 100 %.

## Goals / Non-Goals

**Goals:**

- Garantizar que **toda** la superficie visible de Tabulator dentro de admin (cabecera, filtros, cuerpo, pie, paginación, inputs) use **una sola familia cromática** alineada con el layout (`slate` oscuro + acentos existentes tipo `emerald`).
- Eliminar **bandas blancas/grises claras** y texto ilegible (gris muy claro sobre blanco).
- Unificar **bordes y fondos** entre columnas, sin “corte” visual entre la primera y la última columna.
- Dejar el enfoque **centralizado**: un solo lugar de verdad para estilos de Tabulator en admin (`AdminTabulatorTable` + hoja asociada), reutilizable por todas las tablas.

**Non-Goals:**

- Cambiar datos, columnas, filtros o APIs.
- Sustituir Tabulator por otro grid.
- Rediseñar el panel admin fuera del alcance de las tablas.
- Soporte formal de un segundo tema “light” en admin (solo asegurar que no se rompa de forma obvia si en el futuro el shell cambia).

## Decisions

### D1: Ámbito explícito con contenedor raíz

- Envolver el nodo donde se monta Tabulator (`containerRef`) en un contenedor con clase dedicada, p. ej. **`admin-tabulator-root`** (nombre final a fijar en implementación).
- Reescribir (o duplicar con mayor especificidad) los selectores del tema como:

  `.admin-tabulator-root .tabulator { ... }`,  
  `.admin-tabulator-root .tabulator-header { ... }`,  
  etc.

**Rationale:** reduce fugas y colisiones con CSS global y fuerza a que **todas** las reglas apliquen al mismo árbol DOM que Tabulator genera.

**Alternativas descartadas:**

- Solo aumentar `!important` globalmente → frágil y difícil de mantener.
- Copiar estilos en cada página → duplicación y regresiones.

### D2: Orden de carga y capas

- Mantener: primero `tabulator.min.css` (vía `@import` en `tabulator-theme.css` o import explícito), después **overrides** en el mismo archivo o inmediatamente después en el bundle del cliente.
- Valorar **`@layer`** (si el pipeline PostCSS/Tailwind v4 lo permite en este archivo) para forzar: `base` (Tabulator) → `theme` (overrides admin).

**Rationale:** el bug observado es típico cuando el CSS por defecto gana por orden o especificidad.

### D3: Neutralizar explícitamente el tema “clásico” de Tabulator bajo el ámbito

- Añadir reglas dirigidas a clases que suelen dejar fondos blancos, p. ej.:

  - `.tabulator-row` / estados odd-even si el min.css los redefine en otra capa.
  - Cualquier `.tabulator-cell` con background implícito.
  - Contenedores de cabecera `.tabulator-headers`, `.tabulator-header-contents` si existen en la versión usada.

- Usar **tokens coherentes** con el layout (referencia, no literal obligatoria): fondos tipo `slate-900/950`, texto `slate-200/300`, bordes `slate-800`, sin blanco puro salvo foco accesible.

**Rationale:** el archivo actual ya cubre muchos nodos; el diseño pide un **pase de auditoría** contra el DOM real y el `tabulator.min.css` de la versión instalada.

### D4: Sin cambiar la API de `AdminTabulatorTable`

- La corrección es **solo CSS + contenedor**; props públicas del componente se mantienen.

### D5: Verificación manual obligatoria

- Checklist mínima antes de cerrar tasks:
  - `/admin/usuarios` en **móvil** (ancho estrecho): sin franjas claras, email legible, estado/badge alineado con el resto.
  - Al menos una tabla adicional (p. ej. jugadores o suscripciones) para validar **reuso**.
  - Scroll horizontal si aparece: cabecera y cuerpo **mismo** tono de fondo.

## Risks / Trade-offs

- **[Riesgo] Regresión en exportación PDF/XLS** si el HTML generado dependía de colores por defecto → **Mitigación:** probar exportaciones tras el cambio; ajustar solo CSS de pantalla si hace falta capa `@media screen`.
- **[Riesgo] Mayor especificidad dificulta overrides locales en una página** → **Mitigación:** documentar que personalizaciones por tabla deben ir bajo el mismo ámbito o vía variables CSS.
- **[Trade-off] Bundle CSS** ligeramente mayor si se duplican selectores con prefijo → aceptable frente a UX rota.

## Migration Plan

1. Implementar contenedor con clase de ámbito en `AdminTabulatorTable`.
2. Ajustar `tabulator-theme.css` (o extraer `tabulator-theme.admin-scoped.css`) con selectores prefijados.
3. Verificar en navegador (Chrome + Safari iOS si es posible) las rutas admin con Tabulator.
4. Sin migración de datos ni despliegue especial; rollback = revertir PR.

## Open Questions

- ¿Alguna tabla admin instancia Tabulator **sin** pasar por `AdminTabulatorTable`? (Búsqueda: `new Tabulator` / import directo.) Si existiera, habría que alinearla al mismo patrón o importar el mismo CSS ámbito.
- Versión exacta de `tabulator-tables` en `package.json`: conviene contrastar selectores del `tabulator.min.css` empaquetado con las reglas finales (posibles diferencias entre versiones menores).
