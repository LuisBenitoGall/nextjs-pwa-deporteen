# Migraciones Supabase (DeporTeen)

## Dos capas de versionado

1. **`supabase/schema/baseline_public.sql`** — esquema completo `public` (estado acumulado hasta el volcado). Ver `supabase/schema/README.md`.
2. **`supabase/migrations/*.sql`** — parches incrementales (históricos y futuros).

### Proyecto Supabase **existente** (el de referencia)

- **No** ejecutes el baseline sobre esa base.
- Las migraciones listadas aquí **ya están aplicadas** en remoto (salvo que Luis tenga drift puntual).
- A partir de ahora: solo añade **nuevos** `.sql` con timestamp posterior y despliega con `supabase db push` (o SQL manual + repair).

### Proyecto Supabase **nuevo** (vacío)

1. Sigue **`docs/versionar-esquema.md`** (store del proyecto): `bootstrap-fresh-database.sh` + `migration repair` de históricas.
2. **No** uses `supabase db reset` a ciegas: reaplicaría migraciones históricas **después** del baseline y fallaría por objetos duplicados.

## OpenSpec

Cada cambio de esquema nuevo debe tener change en `openspec/changes/` y, si aplica, delta en specs.

## Referencia

- MED-11 / baseline: change `c2026-09-27-versionar-esquema-baseline`
- Spec: `openspec/specs/database/schema-versioning/spec.md`
