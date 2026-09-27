# Media / Almacenamiento remoto — delta

## Requisitos nuevos

### RF-REM-1 Suscripción obligatoria

El sistema MUST rechazar cualquier subida a almacenamiento remoto facturable (infraestructura Deporteen) si el usuario no tiene una fila `storage_subscriptions` con `status = active` y `current_period_end` posterior a «ahora».

Códigos HTTP:

- `401` — sin sesión
- `403` — `NO_ACTIVE_STORAGE_SUBSCRIPTION`
- `409` — `QUOTA_EXCEEDED`

### RF-REM-2 Cuota por usuario

La cuota MUST calcularse por **usuario** (`match_media.user_id`), sumando el `size_bytes` de **todos** sus jugadores. Solo cuentan filas con `deleted_at IS NULL` y proveedor facturable (`r2`, `supabase`, o rutas legacy en bucket propio). **No** cuenta Google Drive (`drive`) ni almacenamiento local.

### RF-REM-3 Solo servidor

Las subidas facturables MUST realizarse únicamente vía rutas API (`POST /api/remote-media/upload`, alias `/api/r2/upload`). El cliente MUST NOT escribir directamente en Supabase Storage para medios de partido.

### RF-REM-4 Proveedor intercambiable

La implementación física MUST seleccionarse por configuración (`REMOTE_STORAGE_BACKEND`). Añadir un proveedor MUST requerir solo una nueva clase `RemoteStorageBackend` y registro, sin alterar reglas de suscripción/cuota.

### RF-REM-5 Google Drive

Las subidas a Google Drive del usuario MUST permanecer disponibles sin suscripción Deporteen de almacenamiento y MUST NOT consumir la cuota remota Deporteen.

## Criterios de aceptación

- Con suscripción inactiva, `POST /api/remote-media/upload` devuelve 403.
- Con cuota llena, la misma ruta devuelve 409 aunque el cliente manipule el proveedor en UI.
- `NEXT_PUBLIC_CLOUD_MEDIA=1` no omite la suscripción.
- Preferencia `r2`/`supabase` en `/api/storage/provider` rechaza 403 sin suscripción activa.
