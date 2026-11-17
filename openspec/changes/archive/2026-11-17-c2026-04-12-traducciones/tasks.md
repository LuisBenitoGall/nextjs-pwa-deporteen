## 1. Ajustes del script `scripts/sync-i18n.ts`

- [x] 1.1 Incluir en `LOCALE_MAP` todos los `Locale` de `SUPPORTED_LOCALES` (incl. `pt`, `eu`, `gl`).
- [x] 1.2 Mantener orden alfabético de claves de primer nivel al escribir cada `{locale}.json`.
- [x] 1.3 Poda estricta: solo claves presentes en `es.json` en cualquier nivel anidado.
- [x] 1.4 Modo `I18N_SYNC_SKIP_TRANSLATE=1` para sincronización sin API (paridad rápida); no forzar re-traducción cuando el valor destino coincide con el base (cognados).
- [x] 1.5 Documentar opción `--only` para locales parciales.

## 2. Ejecución de sincronización y validación de JSON

- [x] 2.1 Ejecutar `pnpm i18n:sync` con modo estructural donde aplique y comprobar paridad de claves con `es.json` en `en`, `ca`, `it`, `pt`, `eu`, `gl`.
- [x] 2.2 Validar que todos los `.json` en `src/i18n/messages/` parsean correctamente.

## 3. Coherencia con `src/i18n/config.ts`

- [x] 3.1 Verificar que exista un fichero `src/i18n/messages/{locale}.json` por cada entrada de `SUPPORTED_LOCALES`.

## 4. Documentación operativa

- [x] 4.1 Actualizar `scripts/README-i18n-sync.md` (tabla de locales, `pt`/`eu`/`gl`, modo sin API, `--only`).
- [x] 4.2 Actualizar `openspec/specs/internationalization/spec.md` (RF-4, lista de locales, modo estructural, notas de rate limit).

## 5. Cierre OpenSpec

- [x] 5.1 Marcar tareas de este change como completadas (checklist anterior).
- [x] 5.2 Listo para `/opsx:apply` de verificación final o `/opsx:archive` cuando el equipo archive el change.
