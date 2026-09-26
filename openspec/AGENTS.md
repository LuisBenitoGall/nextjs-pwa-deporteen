# Instrucciones para agentes (OpenSpec)

1. Antes de cambiar comportamiento contractual, lee `openspec/specs/` y `openspec/project.md`.
2. Cada entrega de código debe tener un change en `openspec/changes/<nombre>/` con `proposal.md`, `tasks.md`, `.openspec.yaml` y deltas bajo `specs/` cuando aplique.
3. No inventes requisitos de negocio; ambigüedad → documentar opciones en el change o escalar.
4. Tras implementar, ejecuta `pnpm lint`, `pnpm types`, `pnpm test:run`, `pnpm build`.
5. Convenciones de código: alias `@/`, App Router, i18n propio en `src/i18n/`, Supabase SSR en servidor.

Ver también `openspec/README.md`.
