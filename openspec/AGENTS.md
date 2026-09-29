# Instrucciones para agentes (OpenSpec)

1. Antes de cambiar comportamiento contractual, lee `openspec/specs/` y `openspec/project.md`.
2. Cada entrega de código debe tener un change en `openspec/changes/<nombre>/` con `proposal.md`, `tasks.md`, `.openspec.yaml` y deltas bajo `specs/` cuando aplique.
3. **Git y markdown de OpenSpec:** el repo ignora `*.md` por defecto, pero **`openspec/**` está exceptuado** (ver `.gitignore`: `!openspec/` y `!openspec/**`). Los contratos bajo `openspec/` MUST commitearse; un directorio en `changes/` con solo `.openspec.yaml` es un fallo. Antes de cerrar un change, comprueba que los `.md` no están ignorados:
   - `git check-ignore -v openspec/changes/<nombre>/proposal.md` → debe coincidir con `!openspec/**` y el comando debe salir con código **1** (no ignorado).
   - `git add -n openspec/changes/<nombre>/` → debe listar `proposal.md`, `tasks.md` y deltas.
   - `pnpm test:run src/openspec/__tests__/change-proposal-required.test.ts` — cada change **activo** (no `archive/`) debe tener `proposal.md`.
4. No inventes requisitos de negocio; ambigüedad → documentar opciones en el change o escalar.
5. Tras implementar, ejecuta `pnpm lint`, `pnpm types`, `pnpm test:run`, `pnpm build`.
6. Convenciones de código: alias `@/`, App Router, i18n propio en `src/i18n/`, Supabase SSR en servidor.

Ver también `openspec/README.md`.
