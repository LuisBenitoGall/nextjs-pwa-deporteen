# Propuesta: bloqueo de almacenamiento remoto sin suscripción y cuota por usuario

## Contexto

Decisión de Luis (26/09/2026): el almacenamiento remoto de Deporteen queda **bloqueado** sin suscripción vigente y cuando se **supera la cuota** contratada. Hay que cerrar todas las vías de escape y preparar un **enchufe** para el proveedor definitivo. La **cuota es por usuario** (suma de todos sus jugadores), no por jugador.

Auditoría previa (`docs/objetivo-vs-implementacion.md`): con `NEXT_PUBLIC_CLOUD_MEDIA=1` el cliente subía a Supabase Storage sin producto de pago; R2 ya validaba en API.

## Objetivo

1. Unificar validación en servidor: sesión + `storage_subscriptions` activa + cuota (`match_media` no borrados, proveedores facturables).
2. Eliminar subidas directas cliente → Storage para medios de partido.
3. Capa `RemoteStorageBackend` configurable (`REMOTE_STORAGE_BACKEND`).
4. Google Drive del usuario: sin cambios (no consume cuota Deporteen).

## Fuera de alcance

- Precios, planes de asientos de jugador y seats (otro frente).
- Cambios profundos en partido en vivo / sync masivo (PR #48).

## Riesgos

- Usuarios que subían a Supabase con flag legacy dejarán de tener nube gratuita.
- Avatares en bucket remoto pasan por API y requieren suscripción de almacenamiento.

## Verificación

- `pnpm build`, `pnpm types`, `pnpm lint`, `pnpm test:run`.
- Sin credenciales Supabase/R2/Stripe en VM: subidas reales y RLS no verificados en vivo.
