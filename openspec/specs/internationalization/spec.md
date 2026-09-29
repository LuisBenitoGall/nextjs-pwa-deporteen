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

### RF-2b: Páginas legales en SSR

Los textos legales (`LegalDoc`, rutas `/legal/*`) MUST renderizarse con HTTP 200 en servidor usando saneado HTML apto para Node (p. ej. `sanitize-html`), sin `isomorphic-dompurify`/jsdom que provoque error 500 en producción.

### RF-2: Traducción de Contenido

**Descripción**: Todo el contenido visible está traducido.

**Criterios de Aceptación**:
- Mensajes por locale en `src/i18n/messages/{locale}/core.json` (núcleo siempre cargado) y bloques lazy en `src/i18n/messages/{locale}/chunks/{legal,admin}.json` bajo demanda; los monolitos `{locale}.json` en `messages/` son artefacto de `pnpm i18n:sync`
- Uso de `t('clave')` en componentes cliente
- Uso de `tServer()` en componentes servidor
- Valores por defecto cuando falta traducción
- Formato de fechas y números según locale

**Flujo**:
1. Componente necesita texto
2. Llama a `t('clave')` o `tServer('clave')`
3. Sistema busca traducción en locale del usuario
4. Retorna traducción o valor por defecto

### RF-5: Texto disponible desde el primer render

**Descripción**: Ninguna vista se renderiza con cadenas vacías mientras se resuelve el diccionario del locale del usuario.

**Criterios de Aceptación**:
- `I18nProvider` MUST inicializar `dict` con los mensajes de `DEFAULT_LOCALE` importados de forma **estática** (no con `{}` ni con un `import()` en `useEffect`), de modo que el HTML de servidor y el primer render de cliente ya contengan texto
- `t(key)` MUST resolver contra el locale activo y, si falta la clave, contra el locale por defecto antes de devolver cadena vacía
- Un fallo al cargar el diccionario del locale MUST conservar los mensajes del locale por defecto, nunca vaciar el diccionario
- Para locales distintos de `es` el primer pintado muestra el locale por defecto y se sustituye al resolver el diccionario; en ningún momento se muestra texto vacío
- Contrapartida aceptada: el **núcleo** de `es` (`messages/es/core.json`, ~29 kB) viaja en el grafo inicial del bundle a cambio de HTML indexable y sin parpadeo; textos legales y panel Stripe/admin se cargan en `/legal/*` y `/admin/*`. Los demás locales cargan el núcleo con `import()` diferido

**Motivo**: mientras el diccionario arrancaba vacío, la home de producción se servía sin una sola cadena visible (solo iconos), con perjuicio de SEO y de percepción de carga.

### RF-6: Claves de React independientes del texto traducido

**Descripción**: Las listas traducidas usan identificadores estables como `key` de React.

**Criterios de Aceptación**:
- Las `key` de React MUST derivarse de identificadores estables (slug, id, uuid) y **nunca** de valores devueltos por `t()`
- Al volver a renderizar una lista traducida con otro diccionario (carga inicial o cambio de idioma), el número de elementos en el DOM MUST ser exactamente el de la colección de origen

**Motivo**: si el diccionario cambia entre renders, varios elementos pueden compartir `key`. La reconciliación de React solo elimina **una** fibra por clave duplicada, así que las restantes quedan huérfanas y sus nodos permanecen en el DOM. Esto duplicaba visualmente los bloques de deportes y características de la home (8 y 5 tarjetas fantasma, sin texto, delante del grupo correcto).

### RF-7: Paridad de claves verificada en la suite

**Descripción**: Ningún locale se degrada respecto al base sin que falle una prueba.

**Criterios de Aceptación**:
- Todos los ficheros de `src/i18n/messages/` MUST tener exactamente el mismo conjunto de claves que el base, incluidos los elementos indexados de arrays (`legal.<doc>.sections[i].title`, `.html`)
- Ningún valor MUST quedar vacío
- Cada clave MUST usar en todos los locales los mismos marcadores simples que el base; los marcadores dobles de los textos legales (`{{company.name}}`) quedan fuera, los resuelve `LegalDoc`
- La comprobación MUST vivir en la suite (`src/i18n/__tests__/locale-parity.test.ts`), no solo en un script manual
- `interpolate()` MUST reconocer marcadores en mayúsculas y en minúsculas: uno no sustituido se muestra literal al usuario

### RF-9: Diccionarios troceados por área

**Descripción**: Reducir la carga inicial separando el núcleo de mensajes de bloques lazy por ruta.

**Criterios de Aceptación**:
- El runtime MUST cargar el núcleo en el primer render (semilla estática del locale por defecto en cliente)
- Los textos legales (`legal`) y el panel Stripe/admin (`admin_*`, `stripe_*` salvo claves usadas en rutas públicas como `stripe_pago_seguro`) MUST residir en bloques lazy importados bajo demanda
- En `/legal/*` y `/admin/*` los bloques MUST fusionarse antes de renderizar (p. ej. `I18nSubProvider` en layout) de modo que el HTML servido contenga texto traducido
- `src/i18n/messages/es/core.json` MUST NOT superar `CORE_MESSAGES_MAX_BYTES_ES` (definido en `src/i18n/chunks.ts`); un test en la suite MUST fallar si se supera
- `getDictionary(locale, { chunks })` y `pnpm i18n:split` MUST mantener paridad estructural vía merge núcleo + bloques

### RF-8: Calidad de las traducciones

**Descripción**: Criterios para dar una traducción por buena.

**Criterios de Aceptación**:
- Cada fichero de mensajes MUST mantener una **única variante regional**. `pt.json` es portugués de **Brasil**; cambiar de destino exige convertir el fichero en bloque y ajustar `intlLocaleTag`, no cadena a cadena
- Un valor idéntico al del base es aceptable solo si es correcto en su idioma (cognado) o un nombre propio (`DeporTeen`, `Google Drive`, `19.99`); nunca como relleno
- Cuando una cadena no pueda traducirse con confianza razonable, MUST declararse como pendiente de revisión humana en el change, en lugar de rellenarse con el texto base disfrazado
- Las cadenas construidas concatenando fragmentos en el componente (`t('tienes') + número + t('plural')`) no son traducibles a idiomas con otro orden de palabras; MUST convertirse en una sola clave con marcador

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
- Por cada locale en `SUPPORTED_LOCALES`: `src/i18n/messages/{locale}/core.json` y, si aplica, `chunks/legal.json` y `chunks/admin.json`.
- Opcionalmente `{locale}.json` monolítico generado por `pnpm i18n:sync` como referencia de sincronización.

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
7. **Visitante recibe la home con todos los textos en el HTML**: RF-5
8. **Lista traducida no duplica tarjetas al cargar el diccionario**: RF-6
9. **Una clave nueva sin sincronizar rompe la suite**: RF-7
10. **Una cadena no traducible se declara pendiente en vez de inventarse**: RF-8

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
