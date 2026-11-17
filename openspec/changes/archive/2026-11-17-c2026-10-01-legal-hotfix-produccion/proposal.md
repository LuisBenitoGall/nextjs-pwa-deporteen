# Hotfix legal en producción + actualización textos (ES)

## Problema

- Las rutas `/legal/*` respondían **500** en producción (`next start` / Vercel).
- Causa: `importLazyChunk()` usaba `import(\`./messages/${locale}/chunks/${chunk}.json\`)`, que **Webpack no resuelve** en el bundle de servidor → `MODULE_NOT_FOUND` al renderizar `legal/layout.tsx`.
- Textos legales en castellano desactualizados respecto al producto real (PWA, asientos, medios híbridos, pagos únicos sin renovación automática, retención 24 meses).

## Solución

1. **Código:** mapa de imports estáticos por `Locale` × chunk (`legal`, `admin`) en `src/i18n/chunks.ts`.
2. **Placeholders:** `LEGAL_CONSTANTS` con fallback a `COMPANY` / `CONTACT` / dominio `www.deporteen.com`.
3. **Contenido:** revisión sustancial de `src/i18n/messages/es/chunks/legal.json` (aviso legal, privacidad, cookies, términos) alineada con RGPD/LOPDGDD orientativo y decisiones Luis (consentimiento 24 meses, Supabase UE, Stripe, medios locales/Drive/nube).

## Revisión humana pendiente

- **NIF/CIF y datos registrales** (`company.nif`, `company.reg_merc`): completar en env o constants antes de publicación formal.
- **Traducciones legales** (`en`, `ca`, `it`, `pt`, `eu`, `gl`): no actualizadas en este change; requieren revisión jurídica y traducción profesional. Los chunks siguen el texto anterior salvo el fix de carga.
- **Validación jurídica final** del castellano por asesoría externa (texto orientativo, no sustituye abogado).

## Verificación

- `pnpm lint`, `pnpm types`, `pnpm test:run`, `pnpm build`
- `pnpm start` → HTTP **200** en `/legal/aviso-legal`, `/legal/privacidad`, `/legal/politica-cookies`, `/legal/terminos` con HTML y «24 meses» visible.

## Producción (post-deploy)

- `curl -I https://www.deporteen.com/legal/privacidad` → 200
- Navegador: comprobar secciones PWA, asientos, sin renovación automática y plazo 24 meses en cookies/privacidad.
