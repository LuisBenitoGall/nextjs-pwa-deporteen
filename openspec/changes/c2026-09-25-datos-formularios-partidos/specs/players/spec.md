## Delta — players

### MODIFICADO: Alta de deportista

- La temporada vigente se obtiene vía `GET /api/seasons/current`, que garantiza fila en `seasons` (service role).
- Si fallan pasos posteriores al RPC de creación, se intenta desactivar el jugador (`status: false`) para evitar huérfanos activos.

### MODIFICADO: `/players/edit`

- Formulario operativo con parámetro `?id=` o `?playerId=`, usando `POST /api/players/update-name`.

### MODIFICADO: Dashboard

- Banner de límite de deportistas solo si existe al menos una suscripción y `seats_remaining === 0`.
- CTA «Añadir deportista» cuando hay plazas y no hay deportistas listados.

### AÑADIDO: Historial por temporada

- Ruta `/players/[id]/season/[seasonId]` lista partidos de esa temporada.
