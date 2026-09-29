# Archivo: testing-subscriptions-and-player-onboarding

## Estado

**Archivado** (cierre retroactivo de stub sin `proposal.md`). La entrega principal **ya está en `master`**; no hay una lista de tareas abierta bajo este id.

## Alcance original (inferido del commit `e39fd80`, *openspec*, 2026-03-23)

- Introducción de OpenSpec en el repo (`openspec/config.yaml`, specs base).
- **Pruebas Vitest**: `NewPlayerForm.test.tsx`, ampliación de `subscriptions.test.ts`, `seats.test.ts`, `rpc-error-handler.test.ts`, `rpc-validator.test.ts`, mocks Supabase.
- **Onboarding jugador / medios**: rutas API y página `players/[id]/media`, ajustes en `NewPlayerForm` y dashboard.
- Actualización de `openspec/specs/subscriptions/spec.md` y `openspec/specs/players/spec.md` en el mismo commit.
- Script `scripts/sync-i18n.ts` (ampliado respecto al estado anterior).

## ¿Sustituido por un change posterior?

**No** hay un único change sucesor que reemplace este directorio. La cobertura de tests y specs se ha **extendido** después (p. ej. `c2026-09-25-fix-subscription-payment-critical`, formularios de jugador en rutas `(public)`), pero es trabajo adicional, no un reemplazo nominal de este stub.

## Trabajo pendiente real

**No identificado** a partir del historial git: no hay `proposal.md` ni `tasks.md` históricos que definieran entregables sin implementar. Si Luis tenía un alcance de testing más amplio no commiteado, habría que abrir un **change nuevo** con contrato explícito.

## Motivo del archivo

Placeholder creado en el commit *openspec* sin documentación; se archiva para no confundir con un change activo.
