# Versionar esquema Supabase (`public`)

Guía operativa para Luis y agentes. Detalle del volcado: [`supabase/schema/README.md`](../supabase/schema/README.md).

## Contenido en repo

| Ruta | Rol |
|------|-----|
| `supabase/schema/baseline_public.sql` | Estructura completa `public` (estado acumulado de migraciones a fecha de volcado). |
| `supabase/schema/seed_reference_data.sql` | Catálogo `sports` mínimo. |
| `supabase/migrations/*.sql` | Parches incrementales posteriores al baseline. |

## Proyecto DeporTeen existente

No aplicar el baseline sobre la base actual. Usar `supabase db push` solo para **nuevas** migraciones.

## Proyecto nuevo (vacío)

1. Ejecutar `scripts/supabase/bootstrap-fresh-database.sh`.
2. Marcar migraciones históricas ya reflejadas en el baseline:

```bash
supabase migration repair --status applied 20260925140000
supabase migration repair --status applied 20260925153000
# … añadir versiones según `supabase/migrations/` hasta la fecha del baseline
```

No re-ejecutar migraciones antiguas tras el baseline (objetos duplicados).

## Regenerar baseline

Requiere `SUPABASE_DB_URL` (sesión) y PostgreSQL client 17+:

```bash
./scripts/supabase/regenerate-baseline.sh
./scripts/supabase/compare-schema-inventory.sh
```

Actualizar la fecha en `supabase/schema/README.md` y commitear el diff.

## Tipos TypeScript

```bash
pnpm db:types:generate   # SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF
pnpm db:types:check      # exit 0 = alineado con remoto
```
