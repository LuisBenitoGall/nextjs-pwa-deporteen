# Propuesta: baseline del esquema Supabase `public`

## Problema (MED-11)

Solo una fracción del esquema real tenía `CREATE TABLE` en migraciones; el resto existía únicamente en la base de referencia.

## Solución

1. Volcado versionado en `supabase/schema/baseline_public.sql` (pg_dump esquema `public`, con GRANT).
2. Seed reproducible de deportes en `supabase/schema/seed_reference_data.sql`.
3. Scripts de bootstrap, regeneración y comparación de inventario en `scripts/supabase/`.
4. Documentación operativa para Luis en el store del proyecto (`docs/versionar-esquema.md`).
5. Spec `openspec/specs/database/schema-versioning/spec.md`.

## Riesgos

- Regenerar baseline sin revisar diff puede ocultar drift no migrado.
- `supabase db reset` local **no** sustituye al bootstrap mientras coexistan migraciones históricas duplicadas respecto al baseline.
- El volcado incluye `\restrict` de pg_dump 17; requiere psql 17+ para replay.

## Fuera de alcance

- Regeneración de `database.types.ts` (otro agente / PR paralelo).
