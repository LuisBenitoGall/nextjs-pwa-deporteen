# Change: Medio/Bajo tanda 4 — paginación, tipos/BD, PWA medios

## Alcance

| ID | Cambio |
|----|--------|
| **MED-14** | Límite por defecto en listados (100 partidos + «Cargar más» en competición; tope 500 en admin partidos/jugadores/competiciones). |
| **MED-10**, **BAJO-02** | Verificación `pnpm db:types:check` / regeneración con Management API; clientes tipados `Database`. |
| **MED-11** | Documentación operativa `docs/versionar-esquema.md` enlazada al baseline en repo. |
| **MED-23** | Banner global de cola de medios + eventos `media-sync-status`; alineación con cola `/api/remote-media/upload`. |

## Decisión MED-14 (default, sin bloqueo Luis)

- **Opción elegida (A):** paginación **client-side** con tope inicial `LIMITS.MATCH_LIST_PAGE_SIZE` y botón «Cargar más» en el listado de partidos por competición (estadísticas siguen usando el dataset completo ya cargado).
- **Alternativa (B, nota):** paginación server-side con `.range()` en Supabase para competiciones con cientos de partidos; reservada si el rendimiento en móvil lo exige.

## Fuera de alcance

- **CRIT-12** y variables Vercel/Supabase/Stripe/Resend (solo inventario al cierre en `specs/platform/env-deploy.md`).
- Validación E2E con R2/Stripe live.
