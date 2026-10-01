# Delta — i18n lazy chunks legales

## MODIFIED Requirements

### RF-2b: Páginas legales en SSR

Los textos legales (`LegalDoc`, rutas `/legal/*`) MUST renderizarse con HTTP 200 en servidor usando saneado HTML apto para Node (p. ej. `sanitize-html`), sin `isomorphic-dompurify`/jsdom que provoque error 500 en producción.

La carga del bloque `legal` en el layout `/legal` MUST usar imports estáticos por locale (no rutas dinámicas con template) para que Webpack incluya `src/i18n/messages/{locale}/chunks/legal.json` en el bundle de servidor.

#### Scenario: Producción next start

- **WHEN** se solicita `/legal/privacidad` tras `pnpm build && pnpm start`
- **THEN** la respuesta es HTTP 200
- **AND** el cuerpo incluye contenido legal renderizado (p. ej. mención a retención de consentimiento)
