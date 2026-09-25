## Delta RF-2 (Traducción)

### MODIFIED Criterios de Aceptación

- Si una clave no existe en el diccionario del locale, `makeT` retorna `undefined`; los helpers expuestos (`useT`, `tServer`) normalizan a cadena vacía para no mostrar la clave cruda, y los fallbacks `t('clave') || 'texto'` en componentes siguen siendo válidos.
- CI MUST ejecutar un test que falle si algún `t('…')` en `src/` no existe en `src/i18n/messages/es.json`.

## Delta locales soportados

### ADDED

- Los locales oficiales son exactamente: `es`, `en`, `ca`, `it`, `pt`, `eu`, `gl` (`SUPPORTED_LOCALES`). Portugués (`pt`) forma parte del producto; los tests de configuración deben reflejarlo.

## Delta RF-4

### ADDED Criterio

- Claves de banner PWA (`pwa_install_*`) deben existir en todos los JSON sincronizados.
