# Design: c2026-04-12-traducciones

## Context

- **Idioma base**: `es.json` en `src/i18n/messages/` es la fuente de verdad de claves y estructura.
- **Locales soportados**: definidos en `src/i18n/config.ts` como `SUPPORTED_LOCALES`: `es`, `en`, `ca`, `it`, `eu`, `gl`.
- **Estado actual**: `ca`, `en`, `it` están en gran parte alineados con `es`; `eu` y `gl` pueden estar muy incompletos. El script `scripts/sync-i18n.ts` recorre todos los locales distintos de `es` y sincroniza estructura con traducción automática vía `@vitalets/google-translate-api`.
- **Gap conocido en código**: `LOCALE_MAP` en `sync-i18n.ts` solo define destinos para `en`, `ca`, `it`. Los locales **`eu`** y **`gl`** no tienen entrada; en tiempo de ejecución `translate()` podría recibir `to: undefined`, lo que debe corregirse antes o como parte de este change (p. ej. `eu` → `eu`, `gl` → `gl` según soporte de la librería).

## Goals / Non-Goals

**Goals:**

- Lograr **paridad de claves** (y de tipos de valor: string, objeto anidado, array) entre `es.json` y cada `*.json` de destino.
- Garantizar **orden alfabético de las claves de primer nivel** en cada fichero de mensajes tras la actualización (convención explícita del product owner).
- Completar traducciones faltantes de forma **reproducible** (script + revisión humana donde haga falta).
- Documentar el flujo para futuros evolutivos.

**Non-Goals:**

- Cambiar la API de `t()` / `tServer()` ni el formato de claves en componentes.
- Sustituir Google Translate por otro proveedor en este change (solo extender mapeo y robustez si aplica).
- Traducción jurídica certificada de textos legales largos (objetivo es paridad y calidad razonable; revisión legal puede ser tarea aparte).

## Decisions

### D1: Flujo principal de sincronización

- **Decisión**: Mantener **`pnpm i18n:sync`** (`scripts/sync-i18n.ts`) como paso principal para alinear estructura y rellenar cadenas faltantes a partir de `es.json`.
- **Rationale**: Ya implementa recorrido recursivo, manejo de `[PENDIENTE]`, reintentos por rate limit y escritura de JSON.
- **Alternativa descartada**: Edición manual exclusiva de miles de claves → no escalable.

### D2: Idiomas `eu` y `gl` en el traductor automático

- **Decisión**: Ampliar **`LOCALE_MAP`** (o equivalente) para incluir códigos de idioma válidos para la API usada (`eu`, `gl`). Verificar en documentación de `@vitalets/google-translate-api` / Google que los códigos coincidan; si algún idioma fallara, usar código intermedio documentado o marcar `[PENDIENTE]` tras error.
- **Rationale**: Sin esto, `eu`/`gl` no pueden completarse de forma automática de forma fiable.

### D3: Orden alfabético de claves de primer nivel

- **Decisión**: Tras construir el objeto sincronizado, aplicar un paso que **reordene solo las claves de primer nivel** con `Object.keys(...).sort((a,b) => a.localeCompare(b, 'es'))` (o locale neutro `en`) y reconstruya el objeto. Los objetos **anidados** conservan el orden de iteración del `syncObject` alineado al base (mismo orden que `es.json`), para no mezclar criterios.
- **Rationale**: El requisito del usuario es explícito sobre índices de primer nivel; reordenar recursivamente todo podría difuminar la trazabilidad con `es` en bloques anidados.
- **Alternativa**: Script aparte `i18n:sort-keys` ejecutado una vez; aceptable si se documenta en `tasks.md`.

### D4: Valores `[PENDIENTE]` y calidad

- **Decisión**: Mantener el marcador existente para fallos de API o textos que requieran revisión humana. Tras sync, **grep** de `[PENDIENTE]` en `eu`/`gl`/`it`/etc. para lista de revisión opcional en PR.
- **Rationale**: Coherente con el script actual y con la spec de internacionalización.

### D5: Validación previa a merge

- **Decisión**: Comprobar que `JSON.parse` de cada `*.json` funciona y que no quedan claves huérfanas respecto a `es` (el script ya elimina por construcción al iterar solo `base`; claves extra en destino no eliminadas automáticamente — **decidir** en implementación si `syncObject` debe purgar claves no presentes en `es`; recomendación: **sí**, añadir paso de “prune” de claves solo en destino para espejar exactamente el base).

**Nota**: Si hoy el script no elimina claves obsoletas del destino, el diseño recomienda **prune** explícito para paridad estricta; si se prefiere conservar claves legacy temporalmente, documentarlo como excepción en `tasks.md`.

## Risks / Trade-offs

- **[Riesgo] Rate limiting de Google Translate** en sincronizaciones grandes → **Mitigación**: delays y reintentos ya presentes; ejecutar sync en momentos de baja carga o por locale incremental.
- **[Riesgo] Calidad de traducción automática** (tono, términos deportivos, legales) → **Mitigación**: revisión humana prioritaria en `legal.*` y textos críticos; marcar `[PENDIENTE]` donde falle la API.
- **[Trade-off] Orden solo en primer nivel** → anidación sigue orden de `es.json`; aceptado para consistencia con la fuente de verdad.

## Migration Plan

1. Extender `LOCALE_MAP` (y prune si se implementa).
2. Ejecutar `pnpm i18n:sync` (o por locale en CI local).
3. Aplicar ordenación de claves de primer nivel (en script o paso posterior).
4. Revisión humana puntual + commit.
5. Rollback: revertir commit de JSONs y script.

## Open Questions

- ¿Se requiere **eliminación** de claves en locales que ya no existen en `es.json`? (Recomendado para paridad estricta; confirmar con negocio.)
- ¿Los textos **HTML** en `legal.*` deben revisarse siempre a mano tras sync para `eu`/`gl`?
