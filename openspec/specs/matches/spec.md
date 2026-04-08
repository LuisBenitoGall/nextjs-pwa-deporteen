# Gestión de Partidos

## Descripción

Sistema para crear, gestionar y visualizar partidos de jugadores en competiciones específicas. Incluye seguimiento en vivo, estadísticas y multimedia asociada.

## Requisitos Funcionales

### RF-1: Crear Partido

**Descripción**: Usuario con suscripción activa puede crear un nuevo partido para un jugador.

**Criterios de Aceptación**:
- Acceso a `/players/[id]/matches/new` o `/matches/new` (requiere suscripción activa)
- Formulario con:
  - Competición (obligatorio, preselecciona si viene de competición)
  - Deporte (derivado de competición)
  - Temporada (derivado de competición)
  - Fecha y hora (obligatorio)
  - Lugar (opcional)
  - Estado (opcional, ej: "Jugado", "Aplazado")
  - Equipo local (ID y nombre, opcional)
  - Equipo visitante (ID y nombre, opcional)
  - ¿Juega en casa? (checkbox)
  - Marcador local (opcional)
  - Marcador visitante (opcional)
  - Notas (opcional)
- Validación: competición, deporte y fecha son obligatorios
- Al guardar:
  - Se crea registro en `matches`
  - Redirección a `/matches/[id]` (vista de partido)

**Flujo**:
1. Usuario accede desde perfil de jugador o competición
2. Sistema verifica suscripción activa
3. Formulario se pre-llena con competición si viene de contexto
4. Usuario completa datos
5. Validación
6. Inserción en BD
7. Redirección a vista de partido

### RF-2: Ver Partido

**Descripción**: Usuario puede ver detalles completos de un partido.

**Criterios de Aceptación**:
- Acceso a `/matches/[id]` (requiere autenticación y ownership)
- Visualización de:
  - Información básica (fecha, lugar, estado)
  - Competición y deporte
  - Equipos (local vs visitante)
  - Marcador
  - Notas
  - Multimedia asociada (fotos/videos)
- Acciones disponibles:
  - Editar partido
  - Ver galería
  - Seguimiento en vivo
  - Agregar medios

**Flujo**:
1. Usuario accede a `/matches/[id]`
2. Sistema verifica ownership (RLS)
3. Se carga información del partido
4. Se cargan medios asociados
5. Se muestra información completa

### RF-3: Editar Partido

**Descripción**: Usuario puede editar datos de un partido existente.

**Criterios de Aceptación**:
- Acceso a `/matches/[id]/edit` (requiere ownership)
- Formulario pre-llenado con datos actuales
- Mismas validaciones que creación
- Actualización en tabla `matches`
- Redirección a vista de partido

### RF-4: Seguimiento en Vivo

**Descripción**: Usuario puede seguir un partido en tiempo real, actualizando marcador y estadísticas.

**Criterios de Aceptación**:
- Acceso a `/matches/[id]/live` (requiere ownership y suscripción activa)
- Interfaz optimizada para móvil
- Actualización en tiempo real de:
  - Marcador
  - Estadísticas (según deporte)
  - Tiempo transcurrido
- Guardado automático de cambios
- Wake Lock para mantener pantalla encendida
- Modo offline compatible

**Flujo**:
1. Usuario accede a vista en vivo
2. Sistema activa Wake Lock (opcional)
3. Usuario actualiza marcador/estadísticas
4. Cambios se guardan automáticamente
5. Sincronización cuando hay conexión

### RF-5: Gestión de Multimedia

**Descripción**: Usuario puede agregar fotos y videos a un partido.

**Criterios de Aceptación**:
- Acceso a `/matches/[id]/gallery` (requiere ownership)
- Subida de imágenes y videos
- Almacenamiento local (IndexedDB) por defecto
- Opcionalmente subir a Supabase Storage si `NEXT_PUBLIC_CLOUD_MEDIA=1`
- Visualización de galería con thumbnails
- Vista previa de medios (modal)
- Eliminación de medios
- Metadatos: tipo, tamaño, fecha de captura

**Flujo**:
1. Usuario accede a galería del partido
2. Selecciona/captura foto o video
3. Sistema guarda en IndexedDB
4. Sistema crea registro en `match_media`
5. Opcionalmente sube a cloud
6. Muestra en galería

## Requisitos No Funcionales

- **Performance**: Carga eficiente de medios (lazy loading)
- **Offline**: Funcionamiento sin conexión para seguimiento en vivo
- **Storage**: Gestión eficiente de almacenamiento local
- **Seguridad**: RLS garantiza ownership de partidos

## Modelo de Datos

### Tabla `matches`
- `id` (UUID, PK)
- `player_id` (UUID, FK)
- `competition_id` (UUID, FK)
- `season_id` (UUID, FK, nullable)
- `sport_id` (UUID, FK)
- `date_at` (timestamp)
- `place` (text, nullable)
- `status` (text, nullable)
- `home_team_id` (UUID, FK, nullable)
- `home_team_name` (text, nullable)
- `away_team_id` (UUID, FK, nullable)
- `away_team_name` (text, nullable)
- `is_home` (boolean)
- `home_score` (integer, nullable)
- `away_score` (integer, nullable)
- `notes` (text, nullable)
- `stats` (jsonb, nullable): Estadísticas específicas del deporte
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Tabla `match_media`
- `id` (UUID, PK)
- `match_id` (UUID, FK)
- `player_id` (UUID, FK, nullable)
- `kind` (text): 'image' o 'video'
- `mime_type` (text)
- `size_bytes` (integer)
- `width` (integer, nullable)
- `height` (integer, nullable)
- `duration_ms` (integer, nullable, solo videos)
- `device_uri` (text, nullable): Clave en IndexedDB
- `storage_path` (text, nullable): Ruta en Supabase Storage
- `synced_at` (timestamp, nullable): Fecha de sincronización a cloud
- `taken_at` (timestamp, nullable): Fecha de captura
- `created_at` (timestamp)

## Integraciones

- **IndexedDB**: Almacenamiento local de medios
- **Supabase Storage**: Almacenamiento en nube (opcional)
- **MediaCaptureButton**: Componente para captura de medios

## Estados y Flujos

### Estados de Partido
- **Pendiente**: Partido programado, sin jugar
- **En curso**: Seguimiento en vivo activo
- **Finalizado**: Partido completado con marcador
- **Aplazado**: Partido pospuesto

### Flujo de Creación
```
Verificar suscripción → Formulario → Validación → Inserción en matches
                                                      ↓
                                              Redirección a vista partido
```

### Flujo de Multimedia
```
Seleccionar/capturar → Guardar en IndexedDB → Crear registro match_media
                                                      ↓
                                              (Opcional) Subir a Storage
                                                      ↓
                                              Actualizar storage_path
```

## Casos de Uso

1. **Usuario crea partido desde competición**: RF-1
2. **Usuario crea partido desde perfil de jugador**: RF-1
3. **Usuario visualiza partido**: RF-2
4. **Usuario edita partido**: RF-3
5. **Usuario sigue partido en vivo**: RF-4
6. **Usuario agrega foto a partido**: RF-5
7. **Usuario agrega video a partido**: RF-5
8. **Usuario elimina medio de partido**: RF-5

## Estadísticas por Deporte

Cada deporte puede tener estadísticas específicas almacenadas en `stats` (jsonb):
- **Fútbol**: Goles, asistencias, tarjetas, etc.
- **Baloncesto**: Puntos, rebotes, asistencias, etc.
- **Otros**: Según necesidades del deporte

## Límites y Restricciones

- Crear partidos requiere suscripción activa
- Medios se almacenan localmente por defecto
- Tamaño máximo de medios: Configurable (default 10MB)
- Wake Lock requiere interacción del usuario
