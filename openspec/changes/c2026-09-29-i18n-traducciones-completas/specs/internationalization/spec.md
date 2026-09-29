# Delta — Internacionalización (traducciones completas, 29/09/2026)

## ADDED Requirements

### Requirement: Paridad de claves verificada automáticamente

Todos los ficheros de `src/i18n/messages/` MUST tener exactamente el mismo conjunto de claves que el locale base, incluidos los elementos indexados de los arrays (`legal.<doc>.sections[i].title`, `.html`).

La paridad MUST comprobarse en la suite de pruebas, no solo en un script manual. Ningún valor MUST quedar vacío.

#### Scenario: Se añade una clave al locale base sin sincronizar

- **WHEN** se añade una clave a `es.json` y no se propaga al resto
- **THEN** `pnpm test:run` falla indicando el locale y la clave ausente

#### Scenario: Un locale gana una clave que no existe en la base

- **WHEN** un locale contiene una clave que `es.json` no tiene
- **THEN** la suite falla indicando la clave sobrante

#### Scenario: Un valor queda en blanco

- **WHEN** un locale tiene una clave con cadena vacía
- **THEN** la suite falla indicando la clave

### Requirement: Marcadores consistentes entre locales

Cada clave MUST usar en todos los locales el mismo conjunto de marcadores simples (`{DAYS}`, `{n}`) que el locale base. Los marcadores dobles de los textos legales (`{{company.name}}`) quedan fuera de esta comprobación: los resuelve `LegalDoc`, no `t()`.

`interpolate()` MUST reconocer marcadores en mayúsculas y en minúsculas. Un marcador que el motor no sustituye se muestra literal al usuario.

#### Scenario: Mensaje con marcador en minúscula

- **WHEN** un componente llama a `t('player_form_max_blocks', { n: '5' })`
- **THEN** el texto renderizado contiene `5` y no la cadena `{n}`

#### Scenario: Texto legal con marcador doble

- **WHEN** `t()` procesa un valor que contiene `{{company.name}}`
- **THEN** el marcador se devuelve intacto para que lo sustituya `LegalDoc`

### Requirement: Variante regional coherente dentro de cada fichero

Cada fichero de mensajes MUST mantener una única variante regional. Mezclar portugués europeo y brasileño dentro de `pt.json`, o registros distintos en el mismo idioma, se considera un defecto.

`pt.json` es **portugués de Brasil**. Si el destino de producto pasara a ser Portugal, la conversión MUST hacerse en bloque y ajustando `intlLocaleTag`, no cadena a cadena.

#### Scenario: Se añade una cadena nueva a un locale

- **WHEN** se traduce una clave nueva a `pt`
- **THEN** se usa la misma variante que el resto del fichero

### Requirement: Hueco declarado antes que traducción falsa

Cuando una cadena no pueda traducirse con confianza razonable —por falta de contexto o porque la composición del texto lo impide en ese idioma— MUST declararse como pendiente de revisión humana en el change correspondiente, en lugar de rellenarse con el texto base disfrazado.

Las cadenas construidas por concatenación en el componente (`t('tienes') + número + t('plural')`) no son traducibles a idiomas con orden de palabras distinto; MUST convertirse en una sola clave con marcador.

#### Scenario: Fragmento no traducible al euskera

- **WHEN** una cadena se compone concatenando fragmentos y el idioma destino exige otro orden
- **THEN** la clave queda documentada como pendiente y no se inventa una traducción
