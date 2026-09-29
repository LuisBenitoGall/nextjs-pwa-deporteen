# Proposal: c2026-04-12-traducciones

## Why

Los ficheros de mensajes en `src/i18n/messages/` deben reflejar **la misma estructura y cobertura** que el idioma de referencia (**castellano**, `es.json`). Hoy existen lagunas claras (p. ej. locales con pocas claves frente a `es.json`) y riesgo de desalineación al evolucionar la app. Este change formaliza y ejecuta la **completitud de traducciones** para todos los idiomas soportados y la **convención de orden alfabético** en las claves de primer nivel, evitando regresiones en la experiencia multi-idioma.

## What Changes

- Auditar `es.json` como **fuente de verdad** (claves de primer nivel y estructura anidada).
- Completar o alinear **`ca.json`**, **`en.json`**, **`it.json`**, **`eu.json`** y **`gl.json`** para que:
  - exista **paridad de claves** con `es.json` (misma jerarquía; valores traducidos al idioma destino o marcadores acordados donde aplique revisión humana).
  - las **claves de primer nivel** de cada fichero estén en **orden alfabético** (A–Z), coherente entre locales salvo que el tooling imponga otro criterio documentado en `design.md`.
- Actualizar o ejecutar el flujo de sincronización existente (`scripts/sync-i18n.ts` u otro acordado) donde encaje con la política del proyecto (traducción automática + revisión).
- Documentar en specs los **criterios de aceptación** de paridad y orden (delta de internacionalización).

No se cambia el contrato de `t()` / `tServer()` ni el listado de locales en código salvo que un hallazgo lo exija explícitamente (entonces se trataría como posible **BREAKING** y se listaría aparte).

## Capabilities

### New Capabilities

- _(Ninguna capability nueva independiente: el comportamiento queda bajo el paraguas de internacionalización existente.)_

### Modified Capabilities

- `internationalization`: Se amplían o precisan los requisitos sobre **completitud** de cadenas en **todos** los locales definidos en `SUPPORTED_LOCALES`, **paridad estructural** con `es.json`, y **orden alfabético** de claves de primer nivel en los ficheros JSON de mensajes.

## Impact

- **Código / datos**: `src/i18n/messages/*.json` (principalmente `ca`, `en`, `it`, `eu`, `gl`; revisión cruzada con `es`).
- **Configuración**: `src/i18n/config.ts` solo si se detecta incoherencia entre locales del repo y `SUPPORTED_LOCALES` (evaluar en implementación).
- **Scripts**: `scripts/sync-i18n.ts` y documentación asociada (`README-i18n-sync.md` o equivalente) si el proceso de completado pasa por automatización.
- **Especificaciones**: delta en `openspec/changes/c2026-04-12-traducciones/specs/internationalization/spec.md` (y eventual sincronización a `openspec/specs/internationalization/spec.md` al archivar).
- **APIs / backend**: ninguno directo; posible impacto indirecto en textos mostrados según `users.locale`.
