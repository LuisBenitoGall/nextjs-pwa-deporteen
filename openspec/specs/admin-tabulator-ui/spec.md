# Admin Tabulator UI

Especificación de presentación para tablas **Tabulator** renderizadas dentro del panel de administración (`/admin/**`), alineadas con el tema visual del shell admin (fondo oscuro tipo slate, texto claro).

## Requisitos

### Requirement: Coherencia cromática global de la tabla

El sistema MUST aplicar a cada instancia de Tabulator usada en el panel admin una presentación **uniforme**: cabecera, fila de filtros, cuerpo de datos, pie (paginación, contadores) y controles embebidos MUST compartir la misma familia cromática que el layout admin (sin mezclar bloques de tema claro por defecto de Tabulator con bloques oscuros del shell en la misma vista).

#### Scenario: Vista de listado en modo oscuro del admin

- **WHEN** un administrador autenticado abre una página bajo `/admin/**` que muestra una tabla Tabulator (p. ej. usuarios, jugadores, suscripciones)
- **THEN** no MUST aparecer el efecto visual de “mitad tabla clara y mitad oscura” (p. ej. cabecera o filas con fondo blanco o gris muy claro junto a columnas con fondo oscuro)
- **AND** todos los segmentos visibles de la tabla (cabecera, filtros, filas, pie) MUST usar fondos y bordes coherentes con el entorno oscuro del admin

#### Scenario: Desplazamiento horizontal en viewport estrecho

- **WHEN** el usuario desplaza horizontalmente el contenido de la tabla en un ancho de pantalla estrecho (móvil)
- **THEN** la cabecera y el cuerpo MUST mantener la misma línea visual de fondos y bordes (sin que una zona recupere el tema claro por defecto al entrar en el área desplazada)

---

### Requirement: Contraste y legibilidad del texto

El sistema MUST garantizar que todo texto renderizado por Tabulator en el admin (etiquetas de columna, valores de celda, texto del pie, placeholders de filtros) sea **legible** frente al fondo aplicado: MUST evitar texto gris muy claro sobre fondo blanco o casi blanco, y MUST evitar combinaciones que impidan leer emails o datos densos.

#### Scenario: Columna de texto largo (p. ej. email)

- **WHEN** una columna muestra texto plano largo (p. ej. dirección de correo)
- **THEN** el color del texto y el del fondo de la celda MUST ofrecer contraste suficiente para lectura cómoda en condiciones normales de uso
- **AND** el estilo MUST ser coherente con el resto de celdas de la misma fila

---

### Requirement: Cabecera, filtros y controles

El sistema MUST estilar la fila de cabecera de columnas, la fila de filtros (inputs, selects) y los elementos interactivos asociados (ordenación, handles de redimensionado si están activos) de forma que **no** rompan el tema del admin: fondos, bordes, estados `:hover` y `:focus` MUST ser visibles y coherentes con el resto de la UI admin.

#### Scenario: Foco en filtro de cabecera

- **WHEN** el usuario enfoca un input o select de filtro en la cabecera de la tabla
- **THEN** el control MUST mostrar un estado de foco claramente visible (p. ej. borde o anillo) sin revertir la tabla a colores del tema claro por defecto de Tabulator

---

### Requirement: Filas, celdas y rayado opcional

Si se utiliza rayado alternado (zebra) o estados de fila (hover, selección), el sistema MUST limitar las variantes de fondo a **tonos oscuros cercanos** entre sí y al fondo de la página, de modo que la tabla siga percibiéndose como una unidad visual.

#### Scenario: Hover sobre fila

- **WHEN** el usuario pasa el puntero sobre una fila de datos
- **THEN** el resaltado de la fila MUST mantener la coherencia cromática con el tema oscuro del admin
- **AND** MUST NOT introducir franjas blancas o grises claras ajenas al diseño del shell

---

### Requirement: Pie de tabla y paginación

El pie de la tabla (texto tipo “Mostrando X–Y de Z filas”, selector de tamaño de página, botones de página) MUST usar los mismos principios de fondo, texto y bordes que el cuerpo y la cabecera, sin bandas claras aisladas que corten la continuidad visual con el resto del componente.

#### Scenario: Tabla con paginación local activa

- **WHEN** la tabla muestra el pie de paginación de Tabulator
- **THEN** el fondo y el texto del pie MUST integrarse visualmente con el contenedor de la tabla y el layout admin
- **AND** los botones o enlaces de página MUST ser legibles y coherentes con el tema (estados activo/inactivo/hover)

---

### Requirement: Ámbito de estilos y reutilización

Los estilos que implementen esta spec MUST aplicarse de forma **centralizada** a todas las tablas Tabulator del admin que compartan el componente o hoja de estilos acordado en el diseño (p. ej. contenedor con clase de ámbito + hoja CSS dedicada), de modo que nuevas pantallas admin que reutilicen el mismo patrón hereden automáticamente la presentación sin duplicar reglas por página.

#### Scenario: Nueva lista admin basada en el mismo componente

- **WHEN** se añade una nueva página bajo `/admin/**` que instancia la tabla Tabulator mediante el mismo mecanismo central acordado en el diseño del proyecto
- **THEN** la nueva lista MUST cumplir los mismos requisitos visuales que las listas existentes sin añadir overrides ad-hoc obligatorios por pantalla

---

### Requirement: Sin cambio de contratos de datos

La aplicación de esta spec MUST limitarse a presentación (CSS, contenedor DOM, opciones de Tabulator que no alteren el modelo de datos). MUST NOT cambiar el significado de columnas, filtros, exportaciones ni endpoints.

#### Scenario: Exportación tras ajuste visual

- **WHEN** se aplican cambios de estilo conforme a esta spec
- **THEN** las funciones de exportación existentes (p. ej. XLS/PDF) MUST seguir produciendo salida válida; si el formato dependiera de estilos de pantalla, MUST verificarse que no se rompe el flujo de exportación
