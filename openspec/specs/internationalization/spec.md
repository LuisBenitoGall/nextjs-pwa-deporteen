# Internacionalización (i18n)

## Descripción

Sistema de internacionalización que soporta múltiples idiomas para toda la interfaz de usuario. Los códigos de idioma y los ficheros de mensajes MUST alinearse con `SUPPORTED_LOCALES` en `src/i18n/config.ts` (actualmente: castellano, catalán, inglés, italiano, portugués, euskera y galego).

## Requisitos Funcionales

### RF-1: Selección de Idioma

**Descripción**: Usuario puede seleccionar y cambiar su idioma preferido.

**Criterios de Aceptación**:
- Idioma se guarda en perfil de usuario (`users.locale`)
- Idiomas disponibles definidos en `src/i18n/config.ts` (`SUPPORTED_LOCALES`) y etiquetas en `LOCALE_LABELS`
- Cambio de idioma actualiza toda la interfaz
- Preferencia persiste entre sesiones
- Idioma por defecto: `es` (castellano), coherente con `DEFAULT_LOCALE`

**Flujo**:
1. Usuario cambia idioma en configuración
2. Se actualiza `users.locale`
3. Toda la UI se actualiza
4. Preferencia se guarda

### RF-2: Traducción de Contenido

**Descripción**: Todo el contenido visible está traducido.

**Criterios de Aceptación**:
- Archivos de traducción en `src/i18n/messages/{locale}.json`
- Uso de `t('clave')` en componentes cliente
- Uso de `tServer()` en componentes servidor
- Valores por defecto cuando falta traducción
- Formato de fechas y números según locale

**Flujo**:
1. Componente necesita texto
2. Llama a `t('clave')` o `tServer('clave')`
3. Sistema busca traducción en locale del usuario
4. Retorna traducción o valor por defecto

### RF-3: Formato de Fechas y Números

**Descripción**: Fechas y números se formatean según locale del usuario.

**Criterios de Aceptación**:
- Fechas en formato local (DD/MM/YYYY para es, MM/DD/YYYY para en)
- Números con separadores locales
- Monedas en formato local
- Uso de `Intl.DateTimeFormat` y `Intl.NumberFormat`

## Requisitos No Funcionales

- **Performance**: Carga eficiente de archivos de traducción
- **Mantenibilidad**: Claves de traducción organizadas y descriptivas
- **Completitud**: Todas las cadenas traducidas en todos los idiomas
- **Sincronización Automática**: Sistema automático para mantener todos los idiomas sincronizados con el idioma base

## Modelo de Datos

### Archivos de Traducción
- Un fichero por locale en `src/i18n/messages/{locale}.json` para cada entrada de `SUPPORTED_LOCALES` (p. ej. `es.json`, `en.json`, `ca.json`, `it.json`, `pt.json`, `eu.json`, `gl.json`).

### Estructura de Claves
```json
{
  "clave_nivel1": {
    "clave_nivel2": "Traducción"
  },
  "clave_simple": "Traducción"
}
```

## Integraciones

- **Implementación propia** en `src/i18n/` (mensajes JSON, helpers `t` / `tServer` según el código)
- **Intl API**: Formateo de fechas y números

## Estados y Flujos

### Flujo de Cambio de Idioma
```
Usuario cambia idioma → Actualizar users.locale → Recargar traducciones → Actualizar UI
```

## Casos de Uso

1. **Usuario selecciona español**: RF-1
2. **Usuario selecciona catalán**: RF-1
3. **Usuario selecciona inglés**: RF-1
4. **Sistema muestra fecha en formato local**: RF-3
5. **Sistema muestra número en formato local**: RF-3
6. **Desarrollador sincroniza traducciones**: RF-4

## RF-4: Sincronización Automática de Traducciones

**Descripción**: Sistema automático que mantiene todos los archivos de traducción sincronizados con el idioma base (español).

**Criterios de Aceptación**:
- El idioma base es `es.json` (castellano)
- Todos los archivos de traducción MUST tener la misma estructura y claves que `es.json` (paridad estricta; las claves solo en destino se eliminan al sincronizar)
- Cuando se añade una clave en `es.json`, se añade a todos los locales en `SUPPORTED_LOCALES` excepto el base
- Cuando se elimina una clave en `es.json`, se elimina de todos los idiomas
- Las claves nuevas se rellenan mediante traducción automática (Google Translate API) salvo modo solo-estructura (ver abajo)
- Las traducciones existentes se preservan; los marcadores `[PENDIENTE]` legados se reintentan desde el base
- Tras escribir cada `{locale}.json`, las **claves de primer nivel** MUST quedar ordenadas alfabéticamente
- Soporta claves anidadas y arrays
- Se ejecuta mediante `pnpm i18n:sync`
- Modo opcional **solo estructura** (sin llamadas a la API): `I18N_SYNC_SKIP_TRANSLATE=1` + `pnpm i18n:sync` — rellena huecos con el texto del base y mantiene paridad de claves (útil en CI o sin red); las cadenas nuevas pueden quedar en castellano hasta un sync completo

**Flujo**:
1. Desarrollador modifica `src/i18n/messages/es.json`
2. Ejecuta `pnpm i18n:sync`
3. El script lee `es.json` como referencia
4. Para cada locale destino en `SUPPORTED_LOCALES` excepto `es`:
   - Compara estructura con `es.json`
   - Añade claves faltantes (traducidas automáticamente)
   - Elimina claves que no existen en `es.json`
   - Preserva traducciones existentes
5. Actualiza los archivos de traducción

**Implementación**:
- Script: `scripts/sync-i18n.ts`
- Comando NPM: `pnpm i18n:sync`
- Dependencia: `@vitalets/google-translate-api`
- Idioma base: `es` (configurado en `src/i18n/config.ts`)
- Documentación: `scripts/README-i18n-sync.md`

**Notas**:
- Las traducciones automáticas pueden requerir revisión manual para contexto específico (p. ej. textos legales)
- Si la API falla tras reintentos, se conserva temporalmente el texto del idioma base en ese campo
- El script incluye un retardo entre traducciones y reintentos ante rate limiting (ver constantes en `scripts/sync-i18n.ts`)
- Si se alcanza el rate limit, esperar y repetir `pnpm i18n:sync` o usar `--only=locale1,locale2` para continuar por idiomas
- Valores idénticos al castellano en un locale (cognados) no deben forzarse a re-traducción en modo solo-estructura

## Claves de Traducción Principales

- Navegación: `mi_panel`, `cuenta`, `cerrar_sesion`
- Jugadores: `deportista`, `deportista_nuevo`, `deportista_agregar`
- Partidos: `partido`, `partido_nuevo`, `partidos`
- Competiciones: `competicion`, `competicion_nueva`
- Suscripciones: `suscribete`, `suscripcion`
- Errores: `error_*`, `cargando`, `guardando`
