# Esquema versionado (Supabase `public`)

## Propósito

El repositorio debe permitir **recrear el esquema `public` de DeporTeen** sin depender del panel de Supabase ni de una base opaca.

## Estructura en repo

| Ruta | Rol |
|------|-----|
| `supabase/schema/baseline_public.sql` | Volcado **solo estructura** del esquema `public` (tablas, vistas, funciones, triggers, índices, constraints, RLS, GRANT). Refleja el estado **después** de todas las migraciones incrementales incluidas en el repo a la fecha del volcado. |
| `supabase/schema/seed_reference_data.sql` | Datos maestros mínimos: catálogo `sports` v1 (9 deportes). |
| `supabase/schema/00_local_verify_auth_stub.sql` | **Solo verificación local** (Postgres sin Supabase): stubs `auth.*` y roles. **No** ejecutar en Supabase cloud. |
| `supabase/migrations/*.sql` | Parches incrementales históricos y futuros. |

## Convivencia baseline + migraciones históricas

- El baseline **incorpora** el efecto acumulado de las migraciones ya presentes en `supabase/migrations/` a la fecha del volcado.
- **Proyecto Supabase existente (DeporTeen):** no aplicar el baseline sobre la base actual. Seguir usando `supabase db push` solo para **nuevas** migraciones con timestamp posterior al volcado.
- **Proyecto Supabase nuevo (vacío):** aplicar `scripts/supabase/bootstrap-fresh-database.sh` contra la cadena del proyecto, luego marcar las migraciones históricas como ya aplicadas con `supabase migration repair --status applied` (listado en `docs/versionar-esquema.md`). **No** encadenar baseline + re-ejecutar las migraciones históricas (fallaría por duplicados).

## Regeneración

- Requiere `SUPABASE_DB_URL` (pooler sesión) y `pg_dump` 17+ (`scripts/supabase/regenerate-baseline.sh`).
- Tras regenerar, ejecutar verificación local (`compare-schema-inventory.sh`) y actualizar la fecha en documentación.

## Verificación

- Conteos esperados en `public`: 27 tablas, 3 vistas, 36 funciones, 67 políticas RLS, 27 triggers (inventario 2026-09-27).
