# Delta — Deportes (29/09/2026)

## ADDED Requirements

### Requirement: Catálogo de la home desde `src/lib/sports`

El bloque de deportes de la home MUST derivarse de `SPORTS` en `src/lib/sports/index.ts`, no de `public.sports` ni de una lista duplicada en el componente.

Cada entrada MUST llevar `slug` (identificador estable, kebab-case con guion, alineado con la BD) e `i18nKey` (clave del diccionario para el nombre visible). El `slug` MUST ser la `key` de React de la tarjeta.

#### Scenario: Render del bloque de deportes

- **WHEN** se renderiza la home
- **THEN** se pinta exactamente una tarjeta por entrada de `SPORTS`
- **AND** cada tarjeta muestra su nombre traducido, nunca vacío

### Requirement: Listados de deporte filtran por `active`

Toda UI que ofrezca deportes a elegir MUST excluir las filas con `sports.active = false` (deportes legacy desactivados en la reconciliación de slugs). Filas con `active` nulo o ausente cuentan como activas.

El filtro MUST usar el helper compartido `isSportActive()` de `src/lib/sports`.

#### Scenario: Alta de jugador, competición o partido

- **WHEN** el usuario abre un selector de deporte
- **THEN** solo aparecen deportes con `active` distinto de `false`

#### Scenario: Edición de una competición con deporte desactivado

- **WHEN** la competición ya tiene asignado un deporte desactivado
- **THEN** ese deporte sigue visible y seleccionado para no perder el dato
- **AND** el resto de deportes desactivados no se ofrecen
