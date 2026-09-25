# Decisiones — registradas (Luis, 2026-09-25)

| # | Tema | Decisión | Implementación |
|---|------|----------|----------------|
| 1 | Esquema `matches` | **A** — spec alineado a `my_score` / `rival_score` / `rival_team_name` | `specs/matches/spec.md` |
| 2 | `team_id` / equipo | **A** — obligatorio; PWA no admite deportes sin equipo | Validación formulario + RPC + `specs/players/spec.md` |
| 3 | Alta atómica | **A** — RPC con memberships | Migración `20260925153000_*` + `NewPlayerForm`; **requiere aplicar migración en Supabase** |
| 4 | Borrado jugador | **A** — soft delete + limpieza medios | `specs/players/spec.md` (política retención); código existente cleanup |
| 5 | Cuota nube | **A** — solo `deleted_at IS NULL` | `getCloudBytesUsed`; columna asumida en BD (ver migración pendiente si falta) |
| 11 | Screenshots manifest | **B** — sin screenshots | Manifest sin bloque; ver change plataforma |

Pendiente de despliegue BD: ejecutar migraciones en Supabase antes de usar alta atómica en producción.
