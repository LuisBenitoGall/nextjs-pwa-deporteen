# Propuesta: spec única de almacenamiento remoto

## Contexto

Reglas de negocio de almacenamiento remoto, cuota, guardrails de vídeo y umbrales de uso estaban repartidas entre el change `c2026-09-26-remote-storage-access-guards` (solo RF-REM-1…5) y código sin contrato (`guardrails.ts`, abril 2026). Eso generaba contratos vacíos y arqueología obligatoria.

## Cambio

- Nuevo **`openspec/specs/media/spec.md`** como fuente única (RF-REM-1…10).
- Documentado **comportamiento real del código**, con sección de incoherencias (p. ej. umbral 95 % solo UI, no bloqueo).
- Valores numéricos marcados como **pendientes de confirmación de Luis**; cambiar producto = editar spec + código alineado.

## Sustituye / absorbe

- Contenido contractual de `openspec/changes/c2026-09-26-remote-storage-access-guards/specs/media/spec.md` (el change histórico se mantiene; la spec canónica pasa a `openspec/specs/media/`).
- Documentación implícita del stub archivado `cloud-storage-guardrails-r2-video-limits`.

## Fuera de alcance

- Cambiar umbrales o límites en código (solo documentación en esta entrega).
- Archivar otros directorios de `archive/` solo con `.openspec.yaml`.

## Verificación

- Revisión de paridad spec ↔ `guardrails.ts`, `remote-access.ts`, `remote-upload-service.ts`, `CloudUsageStatus.tsx`.
- `pnpm test:run` (tests cloud existentes).
