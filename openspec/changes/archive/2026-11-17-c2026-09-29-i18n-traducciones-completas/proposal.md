# Propuesta: completar las traducciones de los siete locales

## Contexto

Auditoría de `src/i18n/messages/*.json` contra `es` (814 hojas, incluyendo los elementos de `legal.<doc>.sections[i]`):

| Locale | Claves ausentes | Sobrantes | Valor idéntico a `es` | de las cuales, gaps reales |
|---|---:|---:|---:|---:|
| `en` | 2 | 0 | 37 | 20 |
| `ca` | 18 | 0 | 247 | 221 |
| `it` | 18 | 0 | 103 | 87 |
| `pt` | 18 | 0 | 213 | 133 |
| `eu` | 18 | 0 | 92 | 85 |
| `gl` | 18 | 0 | 334 | 66 |

«Idéntico a `es`» es una señal, no un veredicto: incluye cognados legítimos y nombres propios. Por eso `gl` está mucho mejor de lo que aparenta y `ca` bastante peor.

Las mismas 18 claves faltaban en los cinco locales no ingleses: se añadieron a `es.json` y nunca se propagaron. Inglés era el único sin la sección legal de conservación del registro de consentimientos (`legal.cookies.sections[4]`), añadida en #54/#55.

Bloques completos sin traducir: los textos legales de `ca` (47 de 70 hojas, contenido público en `/legal/*`), el panel Stripe de `ca`, y todo el bloque `storage_*` de `pt`.

Inventario completo, con el desglose por área y por clave: `internal/traducciones-faltantes.md` en el Agent Store del proyecto.

## Defecto adicional detectado

`interpolate()` en `src/i18n/dictionary.ts` solo reconocía marcadores en mayúsculas (`/\{([A-Z0-9_.\-]+)\}/g`). Seis claves usan marcadores en minúscula y el usuario veía el literal: «Mostrando los primeros **{n}** de **{total}** partidos.», «… en el bloque **{n}**.». El código sí pasaba los valores; era la expresión regular.

## Cambios

- Los seis locales pasan a **814 hojas**, sin claves ausentes ni sobrantes, con las claves de primer nivel ordenadas alfabéticamente como exige RF-4.
- 606 valores traducidos: `ca` 239, `pt` 142, `it` 105, `eu` 104, `gl` 85, `en` 22.
- `interpolate()` admite marcadores en minúscula. Los `{{...}}` de los textos legales siguen intactos porque su marcador interior no está en `vars` y los consume `LegalDoc.applyPlaceholders`.
- Errata en la referencia: `es.avatar_max_size` «Tamaño maximo» → «Tamaño máximo».
- Nuevo `src/i18n/__tests__/locale-parity.test.ts`: falla si un locale pierde o añade claves, deja un valor vacío, o cambia los marcadores respecto a `es`.
- Se elimina `scripts/verify-i18n-parity.mjs`: no estaba conectado a la suite, omitía `pt` y no decía qué clave fallaba. El test lo sustituye con mejor cobertura.

## Decisiones de criterio

- **`pt` es portugués de Brasil.** El fichero ya estaba escrito en pt-BR (64 cadenas con «você», «assinatura», «esporte», «senha», «arquivo», «tela») aunque `intlLocaleTag` declare `pt-PT`. Se ha traducido en pt-BR para no dejar el fichero mezclado, que sería peor que cualquiera de las dos opciones. **Queda pendiente de decisión de producto** si el objetivo real es Portugal: en ese caso hay que convertir el fichero entero y ajustar `intlLocaleTag`, no solo lo nuevo.
- **Cognados legítimos.** Tras las correcciones quedan valores idénticos a `es` que son correctos en su idioma (`Cancelar` en catalán, `Duración` en gallego, `Cliente` en italiano) o nombres propios (`DeporTeen`, `Google Drive`, `19.99`). No se fuerzan a diferir.

## Pendiente de revisión humana

- **`eu.tienes`** se deja sin traducir a propósito. No es vocabulario sino estructura: el texto se compone concatenando `{t('tienes')} {N} {plural} {t('pendientes_alta')}`, y en euskera el verbo va al final, así que ninguna traducción colocada delante del número da una frase gramatical. Hay que rehacerlo como una sola clave con marcador antes de poder traducirlo. Afecta a `dashboard` y `account`.
- **Euskera**: las 104 cadenas son traducción por modelo, no de hablante nativo. Cadenas de interfaz cortas, confianza razonable, pero conviene una pasada nativa antes de promocionar el euskera como idioma plenamente soportado.
- **Textos legales**: ningún locale distinto de `es` tiene revisión jurídica. Es deuda previa, no introducida aquí; conviene decidir si los `/legal/*` deben servirse solo en castellano hasta tenerla.

## Fuera de alcance

- Rehacer las cadenas compuestas por concatenación (`tienes` + número + plural) como claves con marcador. Es el arreglo correcto para `eu` pero toca componentes, no solo mensajes.
- Convertir `pt` a portugués europeo.

## Verificación

`pnpm lint`, `pnpm types`, `pnpm test:run`, `pnpm build`. El test de paridad se ha comprobado contra una regresión provocada (clave borrada, clave inventada y valor vacío en `eu`): falla en los tres casos indicando la clave.
