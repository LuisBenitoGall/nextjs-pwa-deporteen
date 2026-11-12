# Instrucciones para agentes (OpenSpec)

1. Antes de cambiar comportamiento contractual, lee `openspec/specs/` y `openspec/project.md` (contexto ampliado en `openspec/config.yaml`).
2. Cada entrega de código debe tener un change en `openspec/changes/<nombre>/` con `proposal.md`, `tasks.md`, `.openspec.yaml` y deltas bajo `specs/` cuando aplique.
3. **Git y markdown de OpenSpec:** el repo ignora `*.md` por defecto, pero **`openspec/**` y `.agents/**`** están exceptuados (ver `.gitignore`). Los contratos bajo `openspec/` MUST commitearse; un directorio en `changes/` con solo `.openspec.yaml` es un fallo. Antes de cerrar un change:
   - `git check-ignore -v openspec/changes/<nombre>/proposal.md` → debe salir **1** (no ignorado).
   - `pnpm test:run src/openspec/__tests__/change-proposal-required.test.ts` — cada change **activo** (no `archive/`) debe tener `proposal.md`.
4. No inventes requisitos de negocio; ambigüedad → documentar opciones en el change o escalar.
5. Tras implementar, ejecuta `pnpm lint`, `pnpm types`, `pnpm test:run`, `pnpm build`.
6. Convenciones de código: alias `@/`, App Router, i18n propio en `src/i18n/`, Supabase SSR en servidor.

## Cursor y OpenSpec CLI 2.x

- **CLI en el proyecto:** `@fission-ai/openspec` (devDependency). Tras `pnpm install`: `pnpm openspec list`, `pnpm openspec:doctor`, `pnpm exec openspec validate --changes`.
- **Flujos en Cursor:** OpenSpec 2.0 instala **skills** en `.agents/skills/` (perfil `core`: propose, explore, apply, update, sync, archive). **No** genera comandos slash `/opsx-*` en `.cursor/commands/`; los nombres antiguos de las reglas `.mdc` (`/opsx-apply`) corresponden hoy a skills como **`openspec-apply-change`**.
- **Cómo invocarlos:** en el chat de Cursor, pide explícitamente el skill (p. ej. “usa openspec-propose”) o escribe **`/openspec-propose`**, **`/openspec-apply-change`**, etc. si tu versión de Cursor los autocompleta. Tras clonar o actualizar skills, **reinicia Cursor** para que los detecte.
- Más workflows (verify, onboard, ff…): `openspec config profile` (global) y `pnpm exec openspec update --force` en el repo.

Ver también `openspec/README.md`.
