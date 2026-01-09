# Estadísticas y Visualización de Datos

## Descripción

Sistema para visualizar y analizar estadísticas de jugadores, partidos y competiciones. Incluye gráficos y métricas de rendimiento.

## Requisitos Funcionales

### RF-1: Estadísticas de Jugador

**Descripción**: Visualización de estadísticas agregadas de un jugador.

**Criterios de Aceptación**:
- Acceso desde perfil de jugador
- Métricas mostradas:
  - Total de partidos
  - Partidos por competición
  - Partidos por temporada
  - Estadísticas específicas del deporte (si están disponibles)
- Gráficos visuales (usando Recharts)
- Filtros por temporada y competición

**Flujo**:
1. Usuario accede a estadísticas de jugador
2. Sistema carga datos de partidos
3. Calcula métricas agregadas
4. Genera gráficos
5. Muestra visualización

### RF-2: Estadísticas de Partido

**Descripción**: Visualización de estadísticas detalladas de un partido.

**Criterios de Aceptación**:
- Acceso desde vista de partido
- Estadísticas mostradas según deporte:
  - **Fútbol**: Goles, asistencias, tarjetas, minutos jugados
  - **Baloncesto**: Puntos, rebotes, asistencias, robos, tapones
  - **Otros**: Según configuración del deporte
- Datos almacenados en `matches.stats` (jsonb)
- Visualización clara y legible

### RF-3: Comparativas y Tendencias

**Descripción**: Comparación de rendimiento entre temporadas o competiciones.

**Criterios de Aceptación**:
- Gráficos comparativos
- Tendencias temporales
- Exportación de datos (futuro)

## Requisitos No Funcionales

- **Performance**: Cálculos eficientes de agregaciones
- **Visualización**: Gráficos claros y accesibles
- **Flexibilidad**: Soporte para diferentes deportes con estadísticas distintas

## Modelo de Datos

### Campo `matches.stats` (jsonb)
Estructura flexible según deporte:

**Fútbol**:
```json
{
  "goals": 2,
  "assists": 1,
  "yellow_cards": 0,
  "red_cards": 0,
  "minutes_played": 90
}
```

**Baloncesto**:
```json
{
  "points": 15,
  "rebounds": 8,
  "assists": 5,
  "steals": 2,
  "blocks": 1,
  "minutes_played": 32
}
```

## Integraciones

- **Recharts**: Librería de gráficos
- **date-fns**: Manipulación de fechas para análisis temporal

## Estados y Flujos

### Flujo de Visualización
```
Cargar datos → Calcular métricas → Generar gráficos → Mostrar visualización
```

## Casos de Uso

1. **Usuario ve estadísticas de jugador**: RF-1
2. **Usuario ve estadísticas de partido**: RF-2
3. **Usuario compara temporadas**: RF-3
4. **Usuario analiza tendencias**: RF-3

## Límites y Restricciones

- Estadísticas dependen de datos ingresados en partidos
- No todos los deportes tienen el mismo conjunto de estadísticas
- Cálculos se realizan en tiempo real (no hay cache de agregaciones)
