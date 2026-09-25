# Decisiones A/B para Architecture

## 1. Esquema `matches` (spec vs código)

- **A:** Actualizar spec a `my_score` / `rival_score` / `rival_team_name` (implementación actual).
- **B:** Migrar BD y código a `home_score` / `away_score` del spec legacy.

**Implementación actual:** sin cambio de columnas; solo comportamiento API/UI.

## 2. `team_id` obligatorio para partido

- **A:** Equipo obligatorio al crear competición (elegido en este change).
- **B:** Permitir partidos sin `team_id` y relajar validación en `matches/new`.

## 3. Alta deportista atómica

- **A:** Extender RPC `create_player_link_subscription` para incluir clubs/teams/competitions en una transacción.
- **B:** Mantener pasos cliente + rollback best-effort (`status: false`) implementado ahora.

## 4. Borrado jugador y cuota

- **A:** Soft delete + borrar `match_media`/objetos R2 (parcialmente implementado).
- **B:** Hard delete en cascada documentado en spec RF-4.

## 5. Liberación de cuota con `deleted_at`

- **A:** Filtrar `getCloudBytesUsed` por filas no borradas / `deleted_at`.
- **B:** Solo borrado físico de filas (implementación actual en cleanup).
