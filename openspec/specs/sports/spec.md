# Catálogo de deportes (equipo)

## Descripción

Lista **cerrada** de deportes de equipo soportados en lanzamiento. Cada deporte define el esquema de estadísticas personales en partido (`sports.stats`), consumido por la UI de partido en vivo y agregaciones.

## Requisitos funcionales

### RF-1: Catálogo versionado

- El catálogo MUST estar en Postgres (`public.sports`) con seed reproducible en migraciones (`20260926120000_seats_remaining_and_sports_catalog.sql`).
- Deportes v1 (9): baloncesto, fútbol, fútbol sala, balonmano, rugby, voleibol, waterpolo, hockey hierba, hockey patines.
- **Slugs en BD:** kebab-case con **guion** (`futbol-sala`, `hockey-hierba`), alineados con `src/lib/sports/index.ts` y `normalizeSlug()` (espacios → guion, no guion bajo). Las claves i18n (`futbol_sala`) no son slugs de BD.
- Iconos de UI alineados con `src/lib/sports/index.ts` (slug coherente).
- Cada entrada de `SPORTS` MUST llevar `slug` (identificador estable, usado como `key` de React) e `i18nKey` (clave del diccionario del nombre visible).
- El bloque de deportes de la home MUST derivarse de `SPORTS`, no de `public.sports` ni de una lista duplicada en el componente; se pinta una tarjeta por entrada, siempre con nombre visible.

### RF-1b: Listados de deporte filtran por `active`

- Toda UI que ofrezca deportes a elegir MUST excluir las filas con `sports.active = false` (deportes legacy desactivados en la reconciliación de slugs). `active` nulo o ausente cuenta como activo.
- El filtro MUST usar el helper compartido `isSportActive()` de `src/lib/sports` en lugar de repetir la condición en cada formulario.
- Al **editar** un recurso cuyo deporte ya está desactivado, ese deporte MUST seguir visible y seleccionado para no perder el dato; el resto de desactivados no se ofrecen.
- Cubre `NewPlayerForm`, `CompetitionNewForm`, `CompetitionEditForm` y `NewMatchEmbedded`.

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
   - Añadir icono en `public/icons/` y entrada en `src/lib/sports/index.ts` con `slug` e `i18nKey`.

4. **Pruebas**
   - Test de migración (smoke) o test unitario que valide slug en catálogo esperado.
   - Prueba manual: crear competición + partido + guardar stats.

5. **Datos existentes**
   - No migrar partidos antiguos; nuevos deportes solo afectan altas posteriores.

## Integraciones

- Formularios: `CompetitionNewForm`, `NewMatchEmbedded`, RPC `create_player_link_subscription` (valida `sport_id` existente).
- Estadísticas: `openspec/specs/statistics/spec.md`.
