# Archivo: c2026-04-12-traducciones

## Estado

**Archivado** y **sustituido** por changes posteriores con contrato completo.

## Alcance original (commit `b8bed1f` / `e8f0c0f`, *traducciones*, 2026-04-12)

- Locales **euskera** y **gallego** (`eu.json`, `gl.json`).
- Reordenación y ampliación de `ca`, `en`, `it`.
- Mejoras en `scripts/sync-i18n.ts` y script `scripts/verify-i18n-parity.mjs`.
- Ajustes en `src/i18n/config.ts` y `dictionary.ts`.

## Sustituido por (evidencia en `master`)

| Necesidad del change de 2026-04 | Change que lo cubre hoy |
|---|---|
| Paridad de claves y calidad de traducciones en 7 locales | `c2026-09-29-i18n-traducciones-completas` (`locale-parity.test.ts`, 814 hojas, `interpolate` minúsculas) |
| Troceado núcleo / legal / admin, RF-9 | `c2026-09-29-i18n-diccionario-troceado` |
| Spec consolidada i18n | `openspec/specs/internationalization/spec.md` (RF-7, RF-8, RF-9) |

El script `verify-i18n-parity.mjs` fue **eliminado** en traducciones-completas a favor del test en suite.

## Trabajo pendiente real

**Ninguno** bajo este id; el frente i18n sigue en los changes de 2026-09-29 y en deudas declaradas allí (`eu.tienes`, revisión nativa, pt-BR vs pt-PT).

## Motivo del archivo

Stub con solo `.openspec.yaml`; el alcance quedó obsoleto al mergear la entrega de septiembre 2026.
