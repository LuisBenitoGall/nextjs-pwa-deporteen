# Catálogo de deportes (equipo)

## Descripción

Lista **cerrada** de deportes de equipo soportados en lanzamiento. Cada deporte define el esquema de estadísticas personales en partido (`sports.stats`), consumido por la UI de partido en vivo y agregaciones.

## Requisitos funcionales

### RF-1: Catálogo versionado

- El catálogo MUST estar en Postgres (`public.sports`) con seed reproducible en migraciones (`20260926120000_seats_remaining_and_sports_catalog.sql`).
- Deportes v1 (9): baloncesto, fútbol, fútbol sala, balonmano, rugby, voleibol, waterpolo, hockey hierba, hockey patines.
- Iconos de UI alineados con `src/lib/sports/index.ts` (slug coherente).
- Solo filas con `active = true` se ofrecen en formularios de competición/alta.

### RF-2: Estadísticas por deporte

- `sports.stats` MUST usar `{ "fields": [ { "key", "label", "type" } ] }` (tipos: number, text, boolean).
- Valores de partido en `matches.stats` (jsonb) con claves alineadas a `fields[].key`.

## Protocolo para añadir un deporte nuevo (futuro)

Cuando el negocio apruebe un deporte adicional:

1. **Migración SQL**
   - `INSERT` en `public.sports` con `id` UUID fijo nuevo, `name`, `slug` único, `active`, `stats` JSON.
   - Si aplica, seeds en `sport_categories` (categorías por edad/género).
   - Actualizar este spec y `openspec/project.md` (lista de deportes).

2. **Estadísticas**
   - Definir `stats.fields` con claves estables en inglés/snake_case.
   - Documentar en `openspec/specs/statistics/spec.md` un ejemplo JSON del deporte.
   - Verificar formulario live (`matches/[id]/live`) renderiza los campos.

3. **Traducciones**
   - Claves i18n para nombre visible si se muestra fuera del nombre en BD (opcional).
   - Añadir icono en `public/icons/` y entrada en `src/lib/sports/index.ts`.

4. **Pruebas**
   - Test de migración (smoke) o test unitario que valide slug en catálogo esperado.
   - Prueba manual: crear competición + partido + guardar stats.

5. **Datos existentes**
   - No migrar partidos antiguos; nuevos deportes solo afectan altas posteriores.

## Integraciones

- Formularios: `CompetitionNewForm`, `NewMatchEmbedded`, RPC `create_player_link_subscription` (valida `sport_id` existente).
- Estadísticas: `openspec/specs/statistics/spec.md`.
