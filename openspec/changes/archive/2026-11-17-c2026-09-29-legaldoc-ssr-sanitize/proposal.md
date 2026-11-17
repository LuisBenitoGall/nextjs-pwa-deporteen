# Hotfix: páginas legales 500 en producción (SSR)

## Causa raíz

- `LegalDoc` importaba `isomorphic-dompurify`, que en el servidor instancia **jsdom** y cssstyle intenta leer `.next/browser/default-stylesheet.css` → **ENOENT** en el prerender de Next 15 (Vercel y `next start`).
- **No lo introdujo el contenido i18n de #55**: `LegalDoc.tsx` no cambió en ese PR; solo textos JSON. El fallo es **preexistente** con esa dependencia en SSR; #55 lo hizo visible al exigir páginas legales correctas para los 24 meses.

## Solución

- Sustituir por `sanitize-html` vía `sanitizeLegalHtml()` (`src/lib/sanitize-legal-html.ts`): apto para Node y navegador, sin jsdom ni hoja CSS de jsdom.
- Eliminar `isomorphic-dompurify` del proyecto (único consumidor era `LegalDoc`).

## Rutas afectadas (todas usan `LegalDoc`)

- `/legal/privacidad`, `/legal/politica-cookies`, `/legal/terminos`, `/legal/aviso-legal`

## Verificación

- `pnpm build`, `pnpm types`, `pnpm lint`, `pnpm test:run`
- Producción: HTTP 200 y texto «24 meses» visible en privacidad y cookies.
