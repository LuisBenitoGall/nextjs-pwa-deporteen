# Propuesta: trocear diccionarios i18n

## Contexto

Cada locale cargaba un JSON monolítico (~53 kB en `es`, 745 claves de primer nivel). ~20 % del volumen son textos legales (`legal.*`) y el panel Stripe (`stripe_*`, `admin_*`), usados solo en `/legal/*` y `/admin/*`.

## Cambios

- Mensajes por locale en `messages/{locale}/core.json` + `messages/{locale}/chunks/{legal,admin}.json`.
- `getDictionary(locale, { chunks })` carga el núcleo y fusiona bloques lazy.
- `I18nProvider` siembra el núcleo de `es` en el primer render; carga bloques según `pathname`.
- Layouts de `/legal/*` y `/admin/*` inyectan el bloque correspondiente en SSR vía `I18nSubProvider` (sin vaciar textos).
- Umbral: `CORE_MESSAGES_MAX_BYTES_ES = 40_000` (núcleo actual ~28,9 kB).
- `pnpm i18n:split` y `i18n:sync` regeneran los trozos; los `.json` monolíticos en `messages/` se mantienen como artefacto de sync.

## Invariante

Ninguna vista sin texto: se conserva la semilla del núcleo en `es`, fallback a locale por defecto, y los layouts de ruta aportan los bloques lazy en el HTML servido.

## Verificación

`pnpm lint`, `pnpm types`, `pnpm test:run`, `pnpm build`. Comprobar HTML en producción (home + `/legal/*`) y cambio de idioma en los siete locales.
