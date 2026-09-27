# Delta: persistencia / tipado Supabase

## ADDED

- Los clientes de aplicación SHALL usar tipos generados desde el esquema Supabase `public` (`Database` en `src/lib/database.types.ts`).
- El repositorio SHALL incluir un script documentado para regenerar esos tipos y, cuando haya credenciales, comprobar desfase respecto al proyecto remoto.

## MODIFIED

- Las consultas a datos de usuario en panel admin SHALL usar la tabla `public.users`, no una tabla `profiles` inexistente.
- **`public.users.status`** es **boolean NOT NULL** (default `true`); la baja de cuenta SHALL usar `status = false`. No existe columna `deleted_at` ni valores texto tipo `inactive` en el esquema desplegado.
- **`public.players.status`** (boolean): borrado blando de jugadores SHALL usar `status = false` (mismo criterio operativo ya acordado).
