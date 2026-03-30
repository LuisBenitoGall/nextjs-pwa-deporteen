// src/hooks/useR2Upload.ts
// Hook que abstrae todo el flujo de subida a Cloudflare R2 via Presigned URL:
//   1) Solicita la Presigned URL al backend
//   2) Hace PUT directo a R2 con progreso en tiempo real (XHR)
//   3) Confirma el upload en la BD via /api/storage/confirm-upload
//
// Gestiona estados: idle | requesting | uploading | confirming | success | error

import { useState, useCallback, useRef } from 'react';
import type { PresignedUrlResponse } from '@/app/api/storage/presigned-url/route';

export type UploadStatus =
  | 'idle'
  | 'requesting'
  | 'uploading'
  | 'confirming'
  | 'success'
  | 'error';

export interface UploadResult {
  id: string;
  objectKey: string;
  publicUrl: string | null;
}

export interface UseR2UploadOptions {
  matchId: string;
  playerId?: string | null;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

export interface UseR2UploadReturn {
  status: UploadStatus;
  progress: number; // 0–100
  error: string | null;
  result: UploadResult | null;
  upload: (file: File) => Promise<void>;
  reset: () => void;
  abort: () => void;
}

export function useR2Upload({
  matchId,
  playerId,
  onSuccess,
  onError,
}: UseR2UploadOptions): UseR2UploadReturn {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setError(null);
    setResult(null);
    xhrRef.current = null;
  }, []);

  const abort = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    reset();
  }, [reset]);

  const upload = useCallback(async (file: File) => {
    reset();
    setStatus('requesting');

    try {
      // ── PASO 1: Solicitar Presigned URL al backend ──────────────────────
      const presignRes = await fetch('/api/storage/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          matchId,
          playerId: playerId ?? undefined,
        }),
      });

      if (!presignRes.ok) {
        const errData = await presignRes.json().catch(() => ({}));
        // Error específico de "no tienes el add-on"
        if (errData?.error === 'storage_addon_required') {
          throw new Error('storage_addon_required');
        }
        throw new Error(errData?.message || errData?.error || 'Error al solicitar URL de subida');
      }

      const { presignedUrl, objectKey, publicUrl, expiresAt } =
        (await presignRes.json()) as PresignedUrlResponse;

      // Sanity check: ¿ya expiró?
      if (new Date(expiresAt) < new Date()) {
        throw new Error('La URL de subida expiró antes de usarse. Inténtalo de nuevo.');
      }

      // ── PASO 2: PUT directo a R2 con progreso via XHR ──────────────────
      setStatus('uploading');
      setProgress(0);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress(100);
            resolve();
          } else {
            reject(new Error(`R2 rechazó la subida (HTTP ${xhr.status})`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Error de red durante la subida')));
        xhr.addEventListener('abort', () => reject(new Error('Subida cancelada')));

        xhr.open('PUT', presignedUrl, true);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // ── PASO 3: Confirmar en la BD ─────────────────────────────────────
      setStatus('confirming');

      const kind: 'photo' | 'video' | 'file' = file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('image/')
          ? 'photo'
          : 'file';

      const confirmRes = await fetch('/api/storage/confirm-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectKey,
          publicUrl,
          matchId,
          playerId: playerId ?? null,
          contentType: file.type,
          sizeBytes: file.size,
          kind,
        }),
      });

      if (!confirmRes.ok) {
        const errData = await confirmRes.json().catch(() => ({}));
        throw new Error(errData?.error || 'Error al confirmar el archivo en la base de datos');
      }

      const uploadResult = (await confirmRes.json()) as UploadResult;

      setStatus('success');
      setResult(uploadResult);
      onSuccess?.(uploadResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setStatus('error');
      setError(message);
      onError?.(message);
    }
  }, [matchId, playerId, onSuccess, onError, reset]);

  return { status, progress, error, result, upload, reset, abort };
}
