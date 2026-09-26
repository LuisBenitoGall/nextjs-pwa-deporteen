# Tareas — c2026-09-26-luis-plans-renewal-sports

## OpenSpec

- [x] `proposal.md` con decisiones Luis y opciones email/cron
- [x] Delta `specs/subscriptions/spec.md`
- [x] Delta `specs/sports/spec.md`
- [x] Actualizar specs base `openspec/specs/subscriptions/spec.md` y `openspec/specs/sports/spec.md`

## Base de datos

- [x] Migración `seats_remaining(p_user_id uuid)`
- [x] Seed reproducible catálogo `sports` (9 deportes + `stats`)

## Aplicación

- [x] Avisos in-app escalonados (dashboard + cuenta)
- [x] Constantes `SUBSCRIPTION_EXPIRY_NOTICE_DAYS`
- [x] i18n (es, en, ca, it, pt, eu, gl)

## Calidad

- [x] Tests `expiry-notices.test.ts`
- [x] `pnpm types`, `pnpm lint`, `pnpm build`, `pnpm test:run`

## Pendiente (producto / infra)

- [ ] Elegir opción A/B/C para email programado
- [ ] Si opción A: migrar columnas de notificación y reescribir `check-renewals`
- [ ] Revisar en producción duplicados de `sports` tras seed
