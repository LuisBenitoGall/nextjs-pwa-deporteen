## Delta — Tipos TS y baseline (MED-10, MED-11, BAJO-02)

### RF — Tipos generados (modificado)

**Criterios de aceptación:**

- `src/lib/database.types.ts` se regenera con `pnpm db:types:generate` (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`).
- CI o agentes pueden comprobar paridad con `pnpm db:types:check` (exit 0 = alineado).
- Clientes Supabase de aplicación usan `SupabaseClient<Database, 'public'>` (`src/lib/supabase/types.ts`).

### RF — Baseline reproducible (modificado)

**Criterios de aceptación:**

- `supabase/schema/baseline_public.sql` + `seed_reference_data.sql` documentados en `docs/versionar-esquema.md` y `supabase/schema/README.md`.
- Regeneración opcional vía `scripts/supabase/regenerate-baseline.sh` con `SUPABASE_DB_URL`.
