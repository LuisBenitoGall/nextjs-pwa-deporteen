# Baseline del esquema `public` (DeporTeen)

Volcado generado el **2026-09-27** desde el proyecto Supabase de referencia (`pg_dump` 17, solo `--schema=public`, sin `--no-privileges`).

## Inventario incluido

| Objeto | Cantidad |
|--------|----------|
| Tablas | 27 |
| Vistas | 3 |
| Funciones | 36 |
| Políticas RLS | 67 |
| Triggers (no internos) | 27 |

## Archivos

- **`baseline_public.sql`** — estructura completa + GRANT/ALTER DEFAULT PRIVILEGES (roles Supabase: `anon`, `authenticated`, `service_role`, `supabase_admin`, …).
- **`seed_reference_data.sql`** — catálogo `sports` v1 (9 filas activas); no incluye filas legacy desactivadas que puedan existir en prod.
- **`00_local_verify_auth_stub.sql`** — solo para Postgres local de verificación; **no** usar en Supabase cloud.

## Regenerar

```bash
# Requiere SUPABASE_DB_URL en el entorno y postgresql-client-17
./scripts/supabase/regenerate-baseline.sh
./scripts/supabase/compare-schema-inventory.sh   # contra remoto vía pg env
```

Tras regenerar, revisar el diff de git y actualizar la fecha en este README y en `docs/versionar-esquema.md`.

## Notas técnicas

- Se omiten `CREATE SCHEMA public` y `COMMENT ON SCHEMA public` (Postgres/Supabase ya tienen `public`).
- El dump incluye directivas `\restrict` / `\unrestrict` de pg_dump 17; aplicar con **psql 17+**.
- Referencias a `auth.users` y funciones `auth.*` requieren el esquema `auth` de Supabase (presente en cloud; stub local opcional).
