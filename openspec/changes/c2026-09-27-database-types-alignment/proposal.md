# Change: alineación de tipos Supabase con la BD real

## Problema

`src/lib/database.types.ts` estaba parcialmente manual (~8 tablas, tabla fantasma `profiles`, columnas incorrectas en `players`/`clubs`). El código compilaba pero consultaba columnas inexistentes, provocando fallos en runtime (p. ej. borrado de cuenta, admin apuntando a `profiles`).

## Solución

1. Regenerar tipos con `supabase gen types typescript` contra el proyecto real (27 tablas, 3 vistas, 36 funciones).
2. Tipar todos los clientes con `AppSupabaseClient` (`SupabaseClient<Database, 'public'>`).
3. Corregir desajustes que TypeScript expone (consultas a tablas/columnas inexistentes).
4. Scripts `pnpm db:types:generate` y `pnpm db:types:check`.

## Impacto

- Contrato de datos en compilación; menos sorpresas en producción.
- Admin y reportes usan `public.users` en lugar de `profiles`.
- Algunos endpoints legacy documentados o deshabilitados cuando el esquema no soporta la operación.

## Riesgos

- Regeneración futura puede romper build si el esquema cambia sin actualizar código (comportamiento deseado).

## Criterios de aceptación

- `pnpm types`, `pnpm lint`, `pnpm test:run`, `pnpm build` en verde.
- Clientes en `src/lib/supabase/*` y middleware usan `AppSupabaseClient`.
- Documentado cómo regenerar tipos.
