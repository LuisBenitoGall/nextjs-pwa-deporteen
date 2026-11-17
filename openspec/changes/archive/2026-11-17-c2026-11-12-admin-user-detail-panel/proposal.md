## Why

El listado de usuarios en Admin editaba perfiles mediante un modal sin contexto de suscripciones ni jugadores. Luis Benito (12/11/2026) exige una vista dedicada con permisos diferenciados (lectura `requireAdmin`, mutaciones solo Superadmin en BD) y trazabilidad de cambios en asientos.

## What Changes

- Ruta `/admin/usuarios/[userId]` con pestañas General, Suscripciones (+ histórico) y Jugadores.
- Eliminar `EditUserDialog`; el listado enlaza al detalle.
- `requireSuperadmin()` en mutaciones sensibles (perfil, suscripciones, jugadores, DELETE usuario).
- Columnas `users.admin_notes` y tabla `admin_audit_log` para notas internas y auditoría de PATCH de asientos/fechas.
- APIs bajo `/api/admin/usuarios/[id]` y subrutas.

## Out of scope (confirmación Luis 12/11/2026)

- **No** incluir `storage_subscriptions` (almacenamiento R2) en la ficha de usuario: sin pestaña, listado ni edición de planes/GB de storage en esta entrega.
- Solo `public.subscriptions` (asientos de jugadores) en la pestaña Suscripciones.

## Capabilities

### Modified Capabilities
- `admin`: detalle de usuario, separación Superadmin vs panel admin por email.

## Impact

- `src/lib/auth/adminGuard.ts`, `src/app/admin/usuarios/**`, `src/app/api/admin/usuarios/**`
- Migración Supabase + `database.types.ts`
- i18n `admin` chunk (es, en, ca)
