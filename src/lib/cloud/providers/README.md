# Proveedores de almacenamiento remoto (Deporteen)

La lógica de negocio (suscripción, cuota por usuario, límites de vídeo) vive en:

- `src/lib/cloud/remote-access.ts`
- `src/lib/cloud/remote-upload-service.ts`
- `src/lib/cloud/usage.ts`

Este directorio define **cómo** se escribe y borra un objeto en el backend físico.

## Configuración

| Variable | Valores | Default |
|----------|---------|---------|
| `REMOTE_STORAGE_BACKEND` | `r2`, `supabase` | `r2` |

R2 sigue usando `R2_*` / `NEXT_PUBLIC_R2_PUBLIC_URL`. Supabase Storage usa el bucket `matches` con service role.

## Añadir un proveedor nuevo

1. Crear `src/lib/cloud/providers/<id>-backend.ts` que implemente `RemoteStorageBackend` (`types.ts`).
2. Registrar el id en `BILLABLE_REMOTE_PROVIDERS` (`remote-access.ts`) si consume cuota Deporteen.
3. Añadir la instancia en `backends` de `index.ts` y documentar variables de entorno.
4. Implementar `uploadObject` y `deleteObject` (rutas canónicas en `match_media.storage_path`).
5. Añadir tests de integración simulados y actualizar OpenSpec `specs/media/spec.md`.
6. No exponer subidas directas desde el cliente: solo `POST /api/remote-media/upload`.

## Punto de entrada HTTP

- `POST /api/remote-media/upload` — canónico
- `POST /api/r2/upload` — alias retrocompatible (misma lógica)
