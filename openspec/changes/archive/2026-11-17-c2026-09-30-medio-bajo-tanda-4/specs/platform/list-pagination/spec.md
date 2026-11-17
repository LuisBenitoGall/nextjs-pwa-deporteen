## Delta — Listados largos (MED-14)

### RF — Partidos por competición (modificado)

**Criterios de aceptación:**

- El listado tabular carga todos los partidos de la competición/temporada en cliente (comportamiento actual), pero muestra como máximo `LIMITS.MATCH_LIST_PAGE_SIZE` filas hasta que el usuario pulse «Cargar más».
- Cada pulsación incrementa el visible en pasos de `MATCH_LIST_PAGE_SIZE` hasta mostrar el total.
- Si hay más filas ocultas, se muestra copy i18n `match_list_truncated` con `{n}` = visibles y `{total}` = total.

### RF — Admin (añadido)

**Criterios de aceptación:**

- Listados admin de partidos, jugadores y competiciones aplican `.limit(LIMITS.ADMIN_LIST_MAX)` (500 por defecto) ordenados por recientes.
- Si el número devuelto iguala el límite, la cabecera indica truncado vía i18n `admin_list_truncated`.
