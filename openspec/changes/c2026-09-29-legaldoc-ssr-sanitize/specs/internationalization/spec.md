# Delta — Documentación legal (render SSR)

## ADDED Requirements

### Requirement: Render SSR de páginas legales sin error 500

Las rutas que muestran textos legales vía `LegalDoc` MUST renderizar en servidor (Next App Router) sin depender de jsdom ni `isomorphic-dompurify`.

El saneado HTML MUST usar una librería apta para runtime Node (`sanitize-html` o equivalente documentado), con allowlist acorde a marcado legal (enlaces, listas, énfasis).

#### Scenario: Política de privacidad accesible

- **WHEN** un usuario abre `/legal/privacidad`
- **THEN** la respuesta HTTP es **200**
- **AND** el contenido legal (p. ej. plazo **24 meses**) es visible en el HTML renderizado

#### Scenario: Sin scripts inyectados

- **WHEN** el HTML i18n contiene un fragmento malicioso `<script>`
- **THEN** el saneado lo elimina antes de `dangerouslySetInnerHTML`
