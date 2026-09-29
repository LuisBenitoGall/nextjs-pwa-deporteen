# Archivo: cloud-storage-guardrails-r2-video-limits

## Estado

**Archivado** (cierre retroactivo de stub sin `proposal.md`). El trabajo asociado **ya está en `master`**; no queda implementación pendiente bajo este id.

## Alcance original (inferido del código entregado)

Commit `6e6da67` (*ajustes cloud R2*, 2026-04-18):

- Límites de vídeo en nube: tamaño máximo 250 MB (`MAX_VIDEO_FILE_BYTES`), duración máxima por plan GB (`getMaxVideoDurationSeconds`).
- Umbrales de uso de cuota (70 / 85 / 95 / 100 %) y UI `CloudUsageStatus`.
- Validación en vivo y en `POST /api/r2/upload`; bloqueo de subida por cuota (`hasQuotaForUpload`).
- API `GET /api/cloud/usage`, pruebas en `src/lib/cloud/guardrails.test.ts`.

## Relación con otros changes

**No** sustituido por `c2026-09-26-remote-storage-access-guards`: ese change documenta suscripción obligatoria, cuota por usuario y subida solo vía API (RF-REM-1…5). Los límites de vídeo y los umbrales de porcentaje **no** están en su delta; conviven en código (`guardrails.ts`) con las reglas de acceso remotas.

## Deuda documental (no bloqueante)

No existe `openspec/specs/media/spec.md` consolidado con RF de vídeo/cuota visual. Si Luis quiere contrato único de almacenamiento remoto, conviene un change futuro que fusione RF-REM-* con guardrails de vídeo.

## Motivo del archivo

Directorio creado solo con `.openspec.yaml` (regla `*.md` del `.gitignore` histórico). Se mueve a `archive/` para no dejar un contrato vacío en `changes/`.
