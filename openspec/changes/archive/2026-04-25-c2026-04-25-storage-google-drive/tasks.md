## 1. Esquema de datos y seguridad para Drive persistente

- [x] 1.1 Crear migración Supabase para persistir conexión Google Drive por usuario (incluyendo refresh token cifrado/protegido y metadatos de estado).
- [x] 1.2 Crear migración para preferencia persistente de proveedor (`media_storage_preferences` o equivalente) con catálogo permitido (`local`, `drive`, `r2`, `supabase`).
- [x] 1.3 Formalizar metadatos de `match_media` para Drive (`storage_provider` y `google_drive_file_id` o estrategia equivalente) y plan de migración conservadora para filas existentes.
- [x] 1.4 Definir y aplicar políticas RLS/autorización para que cada usuario solo lea/escriba su conexión y su preferencia.

## 2. API server-side de conexión Google Drive

- [x] 2.1 Implementar `GET /api/google/drive/connect` con generación de `state` anti-CSRF y parámetros OAuth de acceso offline.
- [x] 2.2 Implementar `GET /api/google/drive/callback` para intercambio de código y persistencia segura de credenciales/estado.
- [x] 2.3 Implementar `GET /api/google/drive/status` para devolver estado `connected`, `reconnect-required` o `disconnected` sin exponer secretos.
- [x] 2.4 Implementar `POST /api/google/drive/disconnect` para revocar/eliminar vínculo y dejar estado consistente.

## 3. API de preferencia de proveedor y validaciones

- [x] 3.1 Implementar endpoint autenticado para leer la preferencia persistida de proveedor.
- [x] 3.2 Implementar endpoint autenticado para actualizar preferencia con validación de catálogo permitido.
- [x] 3.3 Rechazar intentos de acceso cruzado o proveedor inválido con errores de autorización/validación tipificados.

## 4. Subida de media Drive y persistencia de metadatos

- [x] 4.1 Implementar ruta servidor de subida Drive (por ejemplo `/api/google/drive/upload`) con validación de sesión y ownership del contexto (match/player).
- [x] 4.2 Integrar refresh de token en servidor antes de subir y manejo explícito de revocación/permisos insuficientes (`reconnect-required`).
- [x] 4.3 Persistir metadatos del medio subido con proveedor `drive` y referencia de archivo Drive.
- [x] 4.4 Definir límites de tamaño/tipo para fotos y videos en la ruta server-side y errores de validación claros.

## 5. UI de ajustes de almacenamiento y selector persistente

- [x] 5.1 Actualizar ajustes de cuenta para consumir estado real de Drive desde backend y mostrar CTAs de conectar/reconectar/desconectar.
- [x] 5.2 Actualizar `useStorageProvider` (o equivalente) para leer/escribir preferencia en backend en lugar de depender solo de `localStorage`.
- [x] 5.3 Asegurar que la preferencia persista entre recargas, reinicios de navegador y cambio de dispositivo.
- [x] 5.4 Definir comportamiento cuando preferencia sea `drive` pero estado no conectado (fallback controlado y mensaje al usuario).

## 6. Resolución de galería y consistencia de disponibilidad

- [x] 6.1 Actualizar resolución de media para que `storage_provider=drive` valide disponibilidad contra Drive (directo con comprobación o proxy server).
- [x] 6.2 Evitar fallback a `device_uri` para medios Drive ya subidos cuando el archivo Drive esté borrado/inaccesible.
- [x] 6.3 Mantener comportamiento existente para `local` (IndexedDB) y proveedores cloud no Drive.
- [x] 6.4 Mostrar estado explícito de medio no disponible cuando Drive no tenga acceso al archivo.

## 7. Tests y verificación funcional

- [x] 7.1 Añadir tests de estado de conexión Drive (`connected`, `reconnect-required`, `disconnected`) y rutas OAuth server-side.
- [x] 7.2 Añadir tests de preferencia persistente de proveedor y rechazo de proveedor inválido/acceso cruzado.
- [x] 7.3 Añadir tests de resolución de galería: archivo Drive movido sigue visible, archivo borrado no se muestra como disponible.
- [x] 7.4 Ejecutar validaciones de calidad del repo (`pnpm lint`, `pnpm test`, `pnpm types`) y corregir incidencias del cambio.

## 8. Despliegue gradual y rollback operativo

- [x] 8.1 Verificar variables de entorno OAuth/Drive y política de secretos antes de habilitar en entornos compartidos.
- [x] 8.2 Definir plan de rollback manteniendo `local` como proveedor por defecto y sin bloquear flujos `r2/supabase`.
- [x] 8.3 Documentar guía operativa de soporte para reconexión de Drive y errores comunes de token/permisos.
