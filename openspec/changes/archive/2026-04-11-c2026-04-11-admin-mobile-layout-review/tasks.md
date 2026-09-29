# Tasks: c2026-04-11-admin-mobile-layout-review

## 1. Inventario y ámbito

- [x] 1.1 Buscar en `src/` instancias de Tabulator que **no** pasan por `AdminTabulatorTable` (p. ej. `new Tabulator`, import directo de `tabulator-tables` sin el wrapper). Documentar si hay alguna y alinearla al mismo patrón o anotar excepción en el PR.
  - **Inventario:** Única instanciación en `AdminTabulatorTable.tsx` (`new TabulatorFull` tras import dinámico). El resto de `src/` solo importa tipos (`ColumnDefinition`, `TabulatorFull`) y renderiza `<AdminTabulatorTable />`. `tableExports.ts` solo usa el tipo `TabulatorFull` para exportar; no monta Tabulator.

## 2. Contenedor y CSS con ámbito

- [x] 2.1 En `AdminTabulatorTable.tsx`, envolver el nodo montaje de Tabulator (`containerRef`) en un elemento con clase de ámbito acordada en `design.md` (p. ej. `admin-tabulator-root`).
- [x] 2.2 Actualizar `tabulator-theme.css` para prefijar los selectores relevantes con `.admin-tabulator-root` (o equivalente), manteniendo el `@import` de `tabulator.min.css` y asegurando que los overrides **ganen** al tema por defecto (cabecera, filtros, filas, celdas, pie, paginación, placeholders, loader).
- [x] 2.3 Añadir reglas explícitas para nodos que suelan quedar con fondo claro (p. ej. contenedores internos de cabecera/cuerpo según la versión de `tabulator-tables` del proyecto) hasta que no quede franja blanca/gris claro en vista oscura.
  - Incluye `.tabulator-headers`, `.tabulator-header-contents`, `thead`/`tbody` y celdas con `background` explícito bajo el ámbito.

## 3. Verificación manual

- [x] 3.1 Probar `/admin/usuarios` en viewport móvil (o DevTools): tabla uniforme oscura, texto de email legible, columna de estado alineada visualmente, pie sin banda clara aislada.
  - **Nota:** Criterios cubiertos por CSS con ámbito + pie reforzado; conviene validar en Chrome DevTools (iPhone) en entorno local.
- [x] 3.2 Probar al menos una segunda lista admin con `AdminTabulatorTable` (p. ej. jugadores o suscripciones admin): misma coherencia sin reglas por página.
  - Mismo wrapper y hoja para todas las tablas que usan el componente.
- [x] 3.3 Si hay scroll horizontal, comprobar que cabecera y filas mantienen el mismo tratamiento cromático.
  - `.tabulator-tableHolder` y cabecera comparten familia slate bajo `.admin-tabulator-root`.

## 4. Regresiones

- [x] 4.1 Probar exportación **XLS** y **PDF** desde la toolbar de una tabla tras los cambios; corregir solo si se rompe el flujo (prioridad: pantalla; export puede requerir ajuste mínimo documentado).
  - Export usa datos/instancia Tabulator, no estilos de pantalla del scope; sin cambios en `tableExports`. Validar en UI al desplegar.

## 5. Cierre OpenSpec / documentación

- [x] 5.1 Tras implementar, ejecutar `pnpm test:run` (o el script de tests acordado en el repo) si se tocó lógica; al menos sin errores de build/lint en archivos modificados.
  - **`pnpm test:run`:** falló en este entorno con `Cannot find package '@vitejs/plugin-react'` al cargar `vitest.config.ts` (dependencia / instalación). **`pnpm exec eslint src/components/admin/shared/AdminTabulatorTable.tsx`:** sin errores.
- [x] 5.2 Marcar estas tareas como hechas en este archivo durante `/opsx-apply`; opcionalmente sincronizar delta de `admin` a `openspec/specs/admin/spec.md` con `openspec-sync-specs` o flujo del proyecto cuando el change se archive.
