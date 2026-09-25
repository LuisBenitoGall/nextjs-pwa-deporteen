## Delta — matches

### DECISIÓN Luis 1-A (2026-09-25): esquema de marcador

- El modelo oficial de partido en BD y API usa **`my_score`**, **`rival_score`** y **`rival_team_name`** (no `home_score` / `away_score` del spec legacy).
- Los deltas de API/UI MUST documentar estos nombres hasta que un change futuro migre columnas (no previsto).

### MODIFICADO: Actualización de partido (API)

- `PATCH /api/matches/[id]` debe comprobar pertenencia del usuario al partido.
- Si el `UPDATE` no devuelve fila, responder **404** (no 200 con `data: null`).
- Errores de autorización o fila inexistente no deben interpretarse como guardado exitoso.

### MODIFICADO: Eliminación de partido

- Antes de borrar el partido, eliminar registros `match_media` asociados y objetos en almacenamiento (R2, Supabase Storage, Drive cuando aplique).

### MODIFICADO: Vista live

- Errores de autoguardado o subida se muestran en banner recuperable; no sustituyen toda la pantalla salvo fallo de carga inicial.

### AÑADIDO: Atajo `/matches/new`

- Página de selección de deportista o redirección si solo hay uno; atajos PWA apuntan a esta ruta.
