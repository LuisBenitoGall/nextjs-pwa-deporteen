# Fix RPC create_player_link_subscription — player_id ambiguo

## Problema
En producción, el alta de deportista con memberships (club/equipo/competición) falla con:
`column reference "player_id" is ambiguous`.

## Causa
`RETURNS TABLE(player_id, subscription_id)` colisiona con `ON CONFLICT (player_id, …)` en inserts de `clubs`/`teams` (migración memberships atómicos).

## Solución
- `#variable_conflict use_variable`
- `ON CONFLICT ON CONSTRAINT uq_clubs_player_name` / `uq_teams_player_club_sport_name`

## Criterios de aceptación
- Alta de deportista con participación completa en producción sin error SQL.
- RPC existente mantiene firma y columnas de retorno.
