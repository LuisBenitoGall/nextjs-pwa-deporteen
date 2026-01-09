# Gestión de Jugadores/Deportistas

## Descripción

Sistema para crear, gestionar y visualizar jugadores (deportistas) asociados a un usuario. Cada usuario puede tener múltiples jugadores según su plan de suscripción.

## Requisitos Funcionales

### RF-1: Crear Jugador

**Descripción**: Usuario puede crear un nuevo jugador con sus datos básicos y participaciones en competiciones.

**Criterios de Aceptación**:
- Acceso a `/players/new` (requiere autenticación)
- Verificación de asientos disponibles (`seats_remaining > 0` o código de acceso válido)
- Formulario con:
  - Nombre completo (obligatorio)
  - Deporte (obligatorio)
  - Competición (obligatorio)
  - Club (opcional)
  - Equipo (opcional, requiere club)
  - Categoría (opcional)
  - Avatar para la temporada (opcional, solo primer bloque)
- Puede agregar múltiples participaciones (hasta `LIMITS.COMPETITION_NUM_MAX_BY_SEASON`)
- Al guardar:
  - Se crea registro en `players`
  - Se crea `player_seasons` para temporada actual
  - Se crean `competitions` según bloques
  - Se crean `clubs` y `teams` si se proporcionan
  - Se guarda avatar localmente si se proporciona
  - Se consume un "seat" o código de acceso

**Flujo**:
1. Usuario accede a `/players/new`
2. Sistema verifica asientos disponibles
3. Usuario completa formulario
4. Usuario puede agregar múltiples participaciones
5. Al guardar, se ejecuta RPC `create_player_link_subscription`
6. Redirección a `/dashboard`

### RF-2: Ver Perfil de Jugador

**Descripción**: Usuario puede ver el perfil completo de un jugador.

**Criterios de Aceptación**:
- Acceso a `/players/[id]` (requiere autenticación y ownership)
- Visualización de:
  - Información básica (nombre, fecha de alta)
  - Avatar de temporada actual
  - Competiciones de temporada actual
  - Contador de partidos por competición
  - Historial de temporadas anteriores
- Botones de acción:
  - Editar nombre
  - Ver multimedia
  - Nuevo partido (si suscripción activa)
  - Volver a panel/cuenta

**Flujo**:
1. Usuario accede a `/players/[id]`
2. Sistema verifica ownership (RLS)
3. Se carga información del jugador
4. Se cargan competiciones de temporada actual
5. Se muestra información y acciones disponibles

### RF-3: Editar Nombre de Jugador

**Descripción**: Usuario puede editar el nombre de un jugador.

**Criterios de Aceptación**:
- Modal o formulario para editar nombre
- Validación: nombre no vacío
- Actualización en tabla `players`
- Actualización en UI sin recargar página completa

### RF-4: Eliminar Jugador

**Descripción**: Usuario puede eliminar un jugador (y todos sus datos asociados).

**Criterios de Aceptación**:
- Confirmación antes de eliminar
- Eliminación en cascada de:
  - Competiciones del jugador
  - Partidos del jugador
  - Medios asociados
  - Temporadas del jugador
- Liberación de "seat" (si aplica)
- Redirección a `/dashboard`

### RF-5: Gestión de Temporadas

**Descripción**: Sistema gestiona temporadas deportivas automáticamente.

**Criterios de Aceptación**:
- Temporada actual se calcula por fecha (1 agosto como inicio)
- Formato: `YYYY-YYYY+1` (ej: 2024-2025)
- Cada jugador puede tener múltiples temporadas
- Avatar se asocia a temporada específica
- Historial muestra temporadas anteriores

## Requisitos No Funcionales

- **Seguridad**: RLS garantiza que usuarios solo ven sus propios jugadores
- **Validación**: Validación de datos antes de guardar
- **Performance**: Carga eficiente de datos relacionados
- **Límites**: Respeto a límites de competiciones por temporada

## Modelo de Datos

### Tabla `players`
- `id` (UUID, PK)
- `user_id` (UUID, FK a users)
- `full_name` (text)
- `birthday` (date, nullable)
- `status` (boolean)
- `created_at` (timestamp)

### Tabla `player_seasons`
- `player_id` (UUID, FK)
- `season_id` (UUID, FK)
- `avatar` (text, nullable): Ruta local o remota
- `is_current` (boolean)
- `created_at` (timestamp)

### Tabla `competitions`
- `id` (UUID, PK)
- `player_id` (UUID, FK)
- `season_id` (UUID, FK)
- `sport_id` (UUID, FK)
- `name` (text)
- `club_id` (UUID, FK, nullable)
- `team_id` (UUID, FK, nullable)
- `category_id` (UUID, FK, nullable)
- `created_at` (timestamp)

### Tabla `clubs`
- `id` (UUID, PK)
- `player_id` (UUID, FK)
- `name` (text)
- `created_at` (timestamp)

### Tabla `teams`
- `id` (UUID, PK)
- `club_id` (UUID, FK)
- `sport_id` (UUID, FK)
- `player_id` (UUID, FK)
- `name` (text)
- `created_at` (timestamp)

## Integraciones

- **RPC `create_player_link_subscription`**: Crea jugador y gestiona suscripción/código
- **RPC `seats_remaining`**: Verifica asientos disponibles
- **RPC `ensure_profile_server`**: Garantiza perfil de usuario

## Estados y Flujos

### Estados de Jugador
- **Activo**: `status = true`, visible y editable
- **Inactivo**: `status = false`, oculto (soft delete)

### Flujo de Creación
```
Verificar asientos → Formulario → Validación → RPC create_player_link_subscription
                                                      ↓
                                              Crear player
                                                      ↓
                                              Crear player_seasons
                                                      ↓
                                              Crear competitions
                                                      ↓
                                              Guardar avatar
                                                      ↓
                                              Redirección dashboard
```

## Casos de Uso

1. **Usuario crea primer jugador**: RF-1
2. **Usuario crea jugador con código de acceso**: RF-1 (bypass seats)
3. **Usuario visualiza perfil de jugador**: RF-2
4. **Usuario edita nombre de jugador**: RF-3
5. **Usuario elimina jugador**: RF-4
6. **Sistema calcula temporada actual**: RF-5
7. **Usuario agrega múltiples participaciones**: RF-1

## Límites y Restricciones

- Máximo de competiciones por temporada: `LIMITS.COMPETITION_NUM_MAX_BY_SEASON`
- Asientos limitados por plan de suscripción
- Un avatar por temporada por jugador
- Un equipo requiere un club asociado
