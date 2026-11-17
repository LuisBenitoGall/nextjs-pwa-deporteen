# Delta spec: Internacionalización (change: c2026-04-12-traducciones)

Cambios respecto a `openspec/specs/internationalization/spec.md` para paridad de mensajes con `es.json`, orden alfabético de claves de primer nivel y cobertura completa de `SUPPORTED_LOCALES` (incl. `eu`, `gl`).

## ADDED Requirements

### Requirement: Paridad de archivos de mensajes con el idioma base

El sistema MUST mantener en `src/i18n/messages/` la **misma jerarquía de claves** y **tipos de valor** (string, objeto, array) que el fichero de referencia **`es.json`** para **cada** locale listado en `SUPPORTED_LOCALES` de `src/i18n/config.ts`, de modo que no existan rutas de clave presentes en `es.json` ausentes en otro locale en el momento de dar por cerrado el proceso de sincronización de este change.

#### Scenario: Clave existente solo en castellano

- **WHEN** una clave existe en `es.json` (en cualquier nivel de anidación coherente con el modelo de mensajes)
- **THEN** el mismo path de clave MUST existir en cada `{locale}.json` para todo `locale` en `SUPPORTED_LOCALES` distinto de `es`

#### Scenario: Clave eliminada del base

- **WHEN** una clave se elimina de `es.json` como fuente de verdad
- **THEN** el proceso de mantenimiento de traducciones MUST eliminar o alinear esa clave en los demás idiomas según lo definido en `design.md` (paridad estricta recomendada)

---

### Requirement: Orden alfabético de claves de primer nivel

Los ficheros `src/i18n/messages/{locale}.json` MUST tener las **claves de primer nivel** ordenadas **alfabéticamente** (orden lexicográfico estable, p. ej. `localeCompare`), de forma independiente por fichero, tras cada actualización masiva generada en el marco de este change.

#### Scenario: Inspección del fichero de un locale

- **WHEN** un revisor abre un `{locale}.json` actualizado
- **THEN** la lista de nombres de propiedades en la raíz del objeto JSON MUST aparecer en orden alfabético ascendente
- **AND** el orden anidado dentro de cada clave de primer nivel MAY seguir el orden derivado de `es.json` (no se exige reordenación recursiva salvo decisión explícita en `design.md`)

---

### Requirement: Sincronización automática para todos los locales incluidos en config

El flujo documentado de sincronización (`pnpm i18n:sync`, `scripts/sync-i18n.ts`) MUST procesar **todos** los locales en `SUPPORTED_LOCALES` excepto el base (`es`), incluyendo **`eu`** y **`gl`**, y MUST disponer de **mapeo de idioma** válido hacia el servicio de traducción automática para cada uno de esos códigos, de modo que no queden locales silenciados por ausencia de configuración.

#### Scenario: Ejecución de i18n:sync tras añadir claves en es.json

- **WHEN** el desarrollador ejecuta `pnpm i18n:sync` tras modificar `es.json`
- **THEN** el script MUST actualizar o crear entradas para **en**, **ca**, **it**, **eu** y **gl** (además de cualquier otro locale no-base en `SUPPORTED_LOCALES`)
- **AND** si la traducción automática falla para una cadena, el valor MUST poder quedar marcado como `[PENDIENTE]` según la política existente

## MODIFIED Requirements

### Requirement: RF-1: Selección de Idioma

El sistema MUST permitir que el usuario seleccione y cambie su idioma preferido entre los locales soportados por la aplicación.

**Criterios de Aceptación**:
- Idioma se guarda en perfil de usuario (`users.locale`)
- Idiomas disponibles MUST corresponder a los definidos en `SUPPORTED_LOCALES` en `src/i18n/config.ts` (castellano, catalán, inglés, italiano, euskera, galego como mínimo en la versión actual del código)
- Cambio de idioma actualiza toda la interfaz
- Preferencia persiste entre sesiones
- Idioma por defecto: el definido en `DEFAULT_LOCALE` (castellano)

**Flujo**:
1. Usuario cambia idioma en configuración
2. Se actualiza `users.locale`
3. Toda la UI se actualiza
4. Preferencia se guarda

#### Scenario: Usuario elige un locale de la lista soportada

- **WHEN** el usuario selecciona un idioma presente en `SUPPORTED_LOCALES`
- **THEN** la interfaz MUST cargar los mensajes desde `src/i18n/messages/{locale}.json` correspondiente
- **AND** ese fichero MUST estar alineado en claves con `es.json` según el requisito de paridad de este change

---

### Requirement: RF-4: Sincronización Automática de Traducciones

El sistema MUST mantener automáticamente todos los archivos de traducción sincronizados con el idioma base (castellano, `es.json`).

**Criterios de Aceptación**:
- El idioma base es `es.json` (castellano)
- Todos los archivos de traducción deben tener la misma estructura y claves que `es.json`
- Cuando se añade una clave en `es.json`, se añade a todos los idiomas en `SUPPORTED_LOCALES` excepto `es`
- Cuando se elimina una clave en `es.json`, se elimina de todos los idiomas (paridad estricta; si en un despliegue concreto se difiere, MUST documentarse excepción en el PR)
- Las claves nuevas se traducen automáticamente usando el mecanismo configurado (p. ej. Google Translate API) con mapeo de código de idioma completo para **en**, **ca**, **it**, **eu**, **gl**
- Las traducciones existentes válidas se preservan según la lógica del script (no sobrescribir sin criterio)
- Soporta claves anidadas y arrays
- Se ejecuta mediante `pnpm i18n:sync`
- Tras sincronización masiva, los ficheros resultantes MUST cumplir el requisito de **orden alfabético de claves de primer nivel** definido en este change (aplicado en script o paso de post-proceso documentado en `design.md`)

**Flujo**:
1. Desarrollador modifica `src/i18n/messages/es.json`
2. Ejecuta `pnpm i18n:sync`
3. El script lee `es.json` como referencia
4. Para cada locale en `SUPPORTED_LOCALES` distinto de `es`:
   - Compara estructura con `es.json`
   - Añade o traduce claves faltantes según reglas del script
   - Elimina claves obsoletas respecto a `es.json` si el proceso implementado incluye “prune”
   - Preserva traducciones existentes cuando corresponda
5. Opcionalmente ordena claves de primer nivel y escribe los JSON
6. Actualiza los archivos de traducción

**Implementación** (referencia, puede evolucionar):
- Script: `scripts/sync-i18n.ts`
- Comando NPM: `pnpm i18n:sync`
- Dependencia: `@vitalets/google-translate-api`
- Idioma base: `es` (configurado en `src/i18n/config.ts`)
- Documentación: `scripts/README-i18n-sync.md` o equivalente

**Notas**:
- Las traducciones automáticas pueden requerir revisión manual para contexto específico
- Las claves que fallan en la traducción pueden marcarse con `[PENDIENTE]`
- El script SHOULD incluir medidas contra rate limiting (delays, reintentos)
- Para buscar traducciones pendientes: buscar `[PENDIENTE]` bajo `src/i18n/messages/`

#### Scenario: Sincronización completa de locales

- **WHEN** se ejecuta `pnpm i18n:sync` en un entorno válido
- **THEN** cada fichero `{locale}.json` para `locale` ∈ `SUPPORTED_LOCALES` \\ `{es}` MUST quedar estructuralmente alineado con `es.json` y cumplir el orden de claves de primer nivel acordado
