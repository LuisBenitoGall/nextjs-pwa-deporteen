## Delta — players

### DECISIÓN Luis 2-A (2026-09-25): equipo obligatorio

- DeporTeen es PWA de deportes de **equipo**; cada competición MUST tener **`team_id`** resuelto (club + equipo en alta).
- El formulario de alta y el RPC MUST rechazar memberships sin club y equipo.

### DECISIÓN Luis 3-A (2026-09-25): alta atómica

- `create_player_link_subscription` acepta `p_season_id` y `p_memberships` (JSON) y crea club/equipo/competición en la **misma transacción** que el jugador y el enlace de suscripción.
- Migración: `supabase/migrations/20260925153000_create_player_memberships_atomic.sql` (**aplicar en Supabase**).

### DECISIÓN Luis 4-A (2026-09-25): borrado y retención

- Borrado de jugador: **soft delete** (`status: false` / `deleted_at` según tabla) y limpieza de `match_media` y objetos en almacenamiento cuando corresponda.
- **Política de retención (producto):** medios en nube se eliminan con el borrado lógico del jugador o cuenta; blobs solo locales (IndexedDB) no se recuperan automáticamente tras desinstalar la PWA.

### MODIFICADO: Alta de deportista

- La temporada vigente se obtiene vía `GET /api/seasons/current`, que garantiza fila en `seasons` (service role).
- Tras el RPC atómico, solo quedan en cliente avatar y `player_seasons`. Si falla post-RPC, rollback `status: false` en jugador (mejor esfuerzo).

### MODIFICADO: `/players/edit`

- Formulario operativo con parámetro `?id=` o `?playerId=`, usando `POST /api/players/update-name`.

### MODIFICADO: Dashboard

- Banner de límite de deportistas solo si existe al menos una suscripción y `seats_remaining === 0`.
- CTA «Añadir deportista» cuando hay plazas y no hay deportistas listados.

### AÑADIDO: Historial por temporada

- Ruta `/players/[id]/season/[seasonId]` lista partidos de esa temporada.
