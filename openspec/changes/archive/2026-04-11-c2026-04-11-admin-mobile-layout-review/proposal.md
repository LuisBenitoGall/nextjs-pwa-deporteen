# Proposal: c2026-04-11-admin-mobile-layout-review

## Why

En el panel de administración (p. ej. listado de usuarios), las tablas construidas con **Tabulator** muestran un estilo **inconsistente con el tema oscuro del layout**: cabeceras y filas con fondos claros, texto con contraste insuficiente y una columna que parece heredar el tema oscuro mientras el resto permanece claro, generando el efecto “mitad blanca y mitad oscura”. Esto degrada la legibilidad, la cohesión visual y la experiencia en móvil. Hace falta **normalizar el aspecto de Tabulator** para que todo el componente (cabecera, filtros, cuerpo, pie, inputs y bordes) sea **uniforme y acorde al entorno** (dark/light) en el que se renderiza el admin.

## What Changes

- Definir y aplicar un **conjunto de estilos (CSS) para Tabulator** en rutas `/admin/**` que:
  - Alinee fondos, texto, bordes y estados hover/focus con el **tema del shell admin** (en modo oscuro: fondos oscuros, texto claro, sin franjas blancas/grises claras por defecto).
  - Cubra **todas las zonas** del componente: cabecera de columnas, fila de filtros, celdas de datos (incluido “zebra” si se mantiene, con tonos oscuros cercanos), pie de paginación/resumen, y controles embebidos (inputs, selects).
  - Corrija el **contraste** del texto frente al fondo en todas las columnas (especialmente email y datos densos).
  - Unifique **bordes y separadores** entre columnas para que no haya discontinuidad visual entre la primera y el última columna.
- Integrar esos estilos de forma **centralizada** (p. ej. import global en layout admin o hoja dedicada) para que **todas** las tablas Tabulator del admin se beneficien sin duplicar reglas por página.
- Documentar en spec los **criterios de aceptación visuales** (dark +, si aplica, coherencia en light) para evitar regresiones futuras.

No se cambia la lógica de negocio ni las APIs; solo presentación y, si hace falta, props de tema de Tabulator que no alteren contratos de datos.

## Capabilities

### New Capabilities

- `admin-tabulator-ui`: Requisitos de presentación y accesibilidad visual para tablas Tabulator dentro del entorno admin: coherencia con el tema (oscuro/claro), ausencia de mezcla de temas en una misma tabla, contraste legible, y cobertura de cabecera, filtros, cuerpo, pie y controles.

### Modified Capabilities

- `admin`: Se amplía el alcance de requisitos del panel admin para incluir explícitamente que las **vistas basadas en Tabulator** cumplen la spec `admin-tabulator-ui` cuando el layout admin está en modo oscuro (o en el tema activo). Los RF existentes de Stripe no se reescriben; se añade trazabilidad entre panel admin y presentación de tablas de datos.

## Impact

- **Código**: Layout y/o páginas bajo `src/app/admin/**`, componentes que instancian Tabulator, hojas de estilo globales o módulos CSS importados en el layout admin (p. ej. `globals.css`, estilos scoped al admin).
- **Dependencias**: Sin cambios de versión obligatorios de `tabulator-tables` salvo que el diseño requiera opciones de tema nativas adicionales (evaluar en `design.md`).
- **APIs / datos**: Ninguno.
- **Sistemas**: Ninguno fuera del front admin.
- **Especificaciones**: Nueva spec en `openspec/changes/c2026-04-11-admin-mobile-layout-review/specs/admin-tabulator-ui/spec.md`; delta o sección enlazada en la spec principal `openspec/specs/admin/spec.md` según convención del repo al sincronizar.
