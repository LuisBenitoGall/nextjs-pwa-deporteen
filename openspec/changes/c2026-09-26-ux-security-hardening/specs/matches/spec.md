## Delta — Partidos

### RF en vivo (modificado)

**Criterios de Aceptación** (añadir):

- El guardado con debounce de notas y estadísticas **no** envía `my_score`/`rival_score`; el marcador se persiste solo con PATCH dedicados (botones ± o inputs de marcador).
- Ante error de carga del partido, la UI muestra título, mensaje y enlace de salida (p. ej. volver al panel), no solo texto rojo.

### RF crear partido (modificado)

**Criterios de Aceptación** (añadir):

- Los marcadores iniciales se insertan como números (`0`), no como strings.
