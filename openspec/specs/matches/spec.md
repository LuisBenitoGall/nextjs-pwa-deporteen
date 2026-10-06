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

**Descripción**: El usuario puede agregar fotos y vídeos a un partido. El alta admite la cámara y, cuando el selector de archivos existentes aplica, archivos que ya están en el dispositivo. La galería sigue siendo solo la interfaz de visualización.

**Criterios de Aceptación**:
- Acceso a `/matches/[id]/gallery` (requiere ownership)
- Subida de imágenes y vídeos
- Almacenamiento local (IndexedDB) por defecto para un medio local
- La subida a la nube, cuando el proveedor efectivo no es el de este selector, sigue la tubería ya vigente. Este requisito no la redefine.
- Visualización de galería con thumbnails
- Vista previa de medios (modal)
- Eliminación de medios
- Metadatos: tipo, tamaño, fecha de captura
- La galería no distingue el origen: un medio del selector ya guardado en local o en Drive se muestra o se reproduce igual que uno del mismo almacenamiento capturado con la cámara
- Foto y Vídeo en la vista en vivo abren la cámara trasera y no ofrecen el selector de archivos ya existentes

**Flujo**:
1. Usuario accede a galería del partido
2. Selecciona/captura foto o video
3. Sistema guarda en IndexedDB
4. Sistema crea registro en `match_media`
5. Opcionalmente sube a cloud
6. Muestra en galería

El lote de archivos ya existentes no usa este flujo de cámara. Sigue los requisitos de selector, destino, copia local y Drive de abajo.

### Requirement: Selector de archivos ya existentes en la vista en vivo
La vista en vivo del partido MUST ofrecer un único control para adjuntar fotos y vídeos que ya están en el dispositivo. El control MUST admitir varios archivos en un mismo gesto y MUST NOT abrir la cámara. El control MUST usar el estilo de Foto, Vídeo y Galería (borde, icono y texto corto), no el de Guardar.

#### Scenario: Usuario con almacenamiento local o Drive, fuera de iOS
- **WHEN** el usuario está en la vista en vivo, su opción de almacenamiento configurada es local o Drive, y el dispositivo no es iOS
- **THEN** la barra inferior muestra el selector de archivos existentes en el puesto que ocupaba Editar, y Editar está en la cabecera, a la derecha de «Partidos de la competición», con el mismo verde de ese enlace

#### Scenario: Varios archivos de foto y de vídeo
- **WHEN** el usuario activa el selector
- **THEN** puede elegir a la vez varias imágenes y varios vídeos, sin forzar la cámara

#### Scenario: Opción de almacenamiento R2
- **WHEN** la opción de almacenamiento configurada es R2
- **THEN** el selector de archivos existentes no se muestra

#### Scenario: Dispositivo iOS
- **WHEN** el dispositivo es iOS
- **THEN** el selector de archivos existentes no se muestra, aunque la opción de almacenamiento sea local o Drive

#### Scenario: El selector no está disponible
- **WHEN** el selector de archivos existentes no se muestra
- **THEN** la barra inferior no reserva una celda vacía y las cinco acciones restantes (pantalla activa, Foto, Vídeo, Galería y Guardar) ocupan el ancho a partes iguales

### Requirement: Destino del lote antes de guardar
Después de elegir los archivos, y antes de guardarlos, el usuario MUST elegir el destino de ese lote: local o Drive. La aplicación MUST NOT ofrecer R2 como destino de este flujo.

#### Scenario: Pregunta de destino
- **WHEN** el usuario ha seleccionado al menos un archivo existente
- **THEN** la aplicación pregunta si ese lote se guarda en local o en Drive, y no ofrece R2

#### Scenario: Cancelar el destino
- **WHEN** el usuario cierra la pregunta de destino sin elegir
- **THEN** no se crea ninguna fila de medio para ese lote

### Requirement: Guardar el lote en local copiando el archivo
El destino local MUST copiar cada archivo al almacenamiento de la app y registrar el medio del partido, de modo que la galería pueda mostrarlo y reproducirlo como el resto de medios locales. Guardar solo el nombre del archivo MUST NOT ser la forma de ver el medio. Este flujo MUST NOT aplicar los límites de cuota ni de duración del almacenamiento remoto facturable.

#### Scenario: Copia local visible en la galería
- **WHEN** el usuario elige destino local para un lote de imágenes o vídeos
- **THEN** cada archivo se copia al almacenamiento local de la app, se crea su fila de medio del partido, y la galería del partido lo muestra o lo reproduce con el mismo criterio que un medio local capturado en el partido

#### Scenario: Otro dispositivo
- **WHEN** el medio se guardó solo en local y el usuario abre la galería en otro dispositivo
- **THEN** ese medio se comporta como el resto de medios locales que no están en la nube

### Requirement: Guardar el lote en Drive como una captura nueva
El destino Drive MUST subir cada archivo con el mismo proceso que una foto o un vídeo tomados en el partido cuando el destino es Drive. El archivo MUST NOT enviarse a R2. Si un archivo del lote falla, el sistema MUST reutilizar el tratamiento archivo a archivo de la captura vigente, descrito en los escenarios de este requisito, y MUST NOT aplicar una política de lote distinta.

#### Scenario: Subida a Drive y reproducción
- **WHEN** el usuario elige destino Drive para un lote de imágenes o vídeos
- **THEN** cada archivo se sube a Drive por el proceso ya usado para una captura nueva y la galería del partido lo muestra o lo reproduce como cualquier otro medio de Drive de ese partido

#### Scenario: Drive no disponible
- **WHEN** el usuario elige destino Drive y la subida responde que Drive no está disponible (no configurado, servicio no disponible o reconexión necesaria)
- **THEN** ese archivo se guarda en local con el mismo tratamiento que la captura del partido, no se envía a R2, se muestra el aviso de reconexión ya existente cuando la captura lo muestra, y el sistema sigue con el siguiente archivo del lote

#### Scenario: Otro fallo de Drive
- **WHEN** la subida a Drive de un archivo del lote falla por un error distinto de Drive no disponible
- **THEN** el sistema muestra el error como en la captura del partido, no procesa los archivos siguientes del lote y conserva los archivos del lote que ya se habían guardado

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
9. **Usuario adjunta archivos ya existentes en la vista en vivo**: RF-5 (selector, destino local o Drive)

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
