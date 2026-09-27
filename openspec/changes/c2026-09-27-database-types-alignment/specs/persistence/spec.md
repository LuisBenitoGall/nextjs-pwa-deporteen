# Delta: persistencia / tipado Supabase

## ADDED

- Los clientes de aplicación SHALL usar tipos generados desde el esquema Supabase `public` (`Database` en `src/lib/database.types.ts`).
- El repositorio SHALL incluir un script documentado para regenerar esos tipos y, cuando haya credenciales, comprobar desfase respecto al proyecto remoto.

## MODIFIED

- Las consultas a datos de usuario en panel admin SHALL usar la tabla `public.users`, no una tabla `profiles` inexistente.
