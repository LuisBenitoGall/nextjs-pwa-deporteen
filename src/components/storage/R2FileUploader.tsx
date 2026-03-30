'use client';
// src/components/storage/R2FileUploader.tsx
// Componente de subida de archivos a Cloudflare R2.
// - Drag & Drop o clic para seleccionar.
// - Barra de progreso animada en tiempo real.
// - Gate de acceso: si el usuario no tiene el add-on, muestra CTA de upgrade.
// - Soporte completo para estados: idle, requesting, uploading, confirming, success, error.

import React, { useCallback, useRef, useState } from 'react';
import { useR2Upload } from '@/hooks/useR2Upload';
import type { UploadResult } from '@/hooks/useR2Upload';

// ──────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────
interface R2FileUploaderProps {
  matchId: string;
  playerId?: string | null;
  /** Si es false, muestra el CTA de "Activa el add-on" en lugar del uploader */
  hasStorageAddon: boolean;
  /** Callback al subir con éxito */
  onUploadComplete?: (result: UploadResult) => void;
  /** Tipos MIME aceptados (default: imágenes y vídeos) */
  accept?: string;
  /** Tamaño máx en MB (solo para la UI; el backend también lo valida) */
  maxSizeMb?: number;
  onUpgradeClick?: () => void;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ──────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────
export function R2FileUploader({
  matchId,
  playerId,
  hasStorageAddon,
  onUploadComplete,
  accept = 'image/*,video/*,application/pdf',
  maxSizeMb = 500,
  onUpgradeClick,
}: R2FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const { status, progress, error: uploadError, result, upload, reset, abort } = useR2Upload({
    matchId,
    playerId,
    onSuccess: onUploadComplete,
  });

  const isLoading = ['requesting', 'uploading', 'confirming'].includes(status);
  const needsAddon = !hasStorageAddon;

  // ── Validación client-side del archivo ───────
  const validateAndSet = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      setClientError(null);

      if (file.size > maxSizeMb * 1024 * 1024) {
        setClientError(`El archivo supera el límite de ${maxSizeMb} MB.`);
        return;
      }

      setSelectedFile(file);
    },
    [maxSizeMb]
  );

  // ── Handlers de drag & drop ───────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      validateAndSet(e.dataTransfer.files?.[0]);
    },
    [validateAndSet]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      validateAndSet(e.target.files?.[0]);
    },
    [validateAndSet]
  );

  // ── Subida ────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    await upload(selectedFile);
  }, [selectedFile, upload]);

  const handleReset = useCallback(() => {
    reset();
    setSelectedFile(null);
    setClientError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [reset]);

  // ──────────────────────────────────────────────
  // RENDER: Gate de pago
  // ──────────────────────────────────────────────
  if (needsAddon) {
    return (
      <div style={styles.gateContainer}>
        <div style={styles.gateLock}>🔒</div>
        <h3 style={styles.gateTitle}>Almacenamiento en la Nube</h3>
        <p style={styles.gateDescription}>
          Guarda fotos y vídeos de tus partidos en la nube con acceso desde cualquier dispositivo.
          Este es un add-on premium disponible con tu suscripción.
        </p>
        <button
          style={styles.upgradeButton}
          onClick={onUpgradeClick}
          type="button"
        >
          ✨ Activar Add-on de Storage
        </button>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // RENDER: Éxito
  // ──────────────────────────────────────────────
  if (status === 'success' && result) {
    return (
      <div style={styles.successContainer}>
        <div style={styles.successIcon}>✅</div>
        <p style={styles.successTitle}>¡Archivo subido con éxito!</p>
        {result.publicUrl && (
          <a
            href={result.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.successLink}
          >
            Ver archivo →
          </a>
        )}
        <button style={styles.secondaryButton} onClick={handleReset} type="button">
          Subir otro archivo
        </button>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // RENDER: Zona de upload
  // ──────────────────────────────────────────────
  const activeError = clientError || (uploadError && uploadError !== 'storage_addon_required' ? uploadError : null);

  return (
    <div style={styles.container}>
      {/* Drop Zone */}
      {!selectedFile && !isLoading && (
        <div
          style={{
            ...styles.dropZone,
            ...(isDragging ? styles.dropZoneActive : {}),
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Zona de arrastre para subir archivos"
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="r2-file-input"
          />
          <div style={styles.dropIcon}>{isDragging ? '📂' : '☁️'}</div>
          <p style={styles.dropTitle}>
            {isDragging ? 'Suelta el archivo aquí' : 'Arrastra un archivo o haz clic para seleccionar'}
          </p>
          <p style={styles.dropSubtitle}>
            Imágenes, vídeos y PDFs · Máximo {maxSizeMb} MB
          </p>
        </div>
      )}

      {/* Preview del archivo seleccionado */}
      {selectedFile && !isLoading && status !== 'success' && (
        <div style={styles.previewContainer}>
          <div style={styles.previewInfo}>
            <span style={styles.previewFileIcon}>📄</span>
            <div>
              <p style={styles.previewFileName}>{selectedFile.name}</p>
              <p style={styles.previewFileSize}>{formatBytes(selectedFile.size)}</p>
            </div>
          </div>
          <div style={styles.previewActions}>
            <button
              style={styles.primaryButton}
              onClick={handleUpload}
              disabled={isLoading}
              type="button"
              id="r2-upload-btn"
            >
              ☁️ Subir a la nube
            </button>
            <button
              style={styles.secondaryButton}
              onClick={handleReset}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      {isLoading && (
        <div style={styles.progressContainer}>
          <div style={styles.progressInfo}>
            <span style={styles.progressLabel}>
              {status === 'requesting' && '🔐 Preparando subida segura…'}
              {status === 'uploading' && `⬆️ Subiendo a R2… ${progress}%`}
              {status === 'confirming' && '💾 Guardando en base de datos…'}
            </span>
            {status === 'uploading' && (
              <span style={styles.progressPercent}>{progress}%</span>
            )}
          </div>
          <div style={styles.progressBarTrack}>
            <div
              style={{
                ...styles.progressBarFill,
                width: status === 'requesting' ? '5%' : status === 'confirming' ? '100%' : `${progress}%`,
              }}
            />
          </div>
          {status === 'uploading' && (
            <button
              style={styles.abortButton}
              onClick={abort}
              type="button"
            >
              Cancelar subida
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {activeError && (
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>⚠️ {activeError}</p>
          <button style={styles.secondaryButton} onClick={handleReset} type="button">
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Estilos inline (compatible con SSR, sin Tailwind extra)
// ──────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    fontFamily: 'inherit',
  },
  dropZone: {
    border: '2px dashed #334155',
    borderRadius: '12px',
    padding: '40px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
    background: '#0f172a',
    userSelect: 'none',
  },
  dropZoneActive: {
    borderColor: '#6366f1',
    background: '#1e1b4b',
  },
  dropIcon: {
    fontSize: '2.5rem',
    marginBottom: '12px',
  },
  dropTitle: {
    color: '#e2e8f0',
    fontSize: '1rem',
    fontWeight: 600,
    margin: '0 0 6px 0',
  },
  dropSubtitle: {
    color: '#64748b',
    fontSize: '0.85rem',
    margin: 0,
  },
  previewContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px',
    background: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #1e293b',
  },
  previewInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  previewFileIcon: {
    fontSize: '2rem',
  },
  previewFileName: {
    margin: 0,
    color: '#e2e8f0',
    fontWeight: 600,
    fontSize: '0.95rem',
    wordBreak: 'break-all',
  },
  previewFileSize: {
    margin: 0,
    color: '#64748b',
    fontSize: '0.8rem',
  },
  previewActions: {
    display: 'flex',
    gap: '10px',
  },
  progressContainer: {
    padding: '20px',
    background: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #1e293b',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  progressLabel: {
    color: '#94a3b8',
    fontSize: '0.9rem',
  },
  progressPercent: {
    color: '#6366f1',
    fontWeight: 700,
    fontSize: '0.9rem',
  },
  progressBarTrack: {
    height: '8px',
    background: '#1e293b',
    borderRadius: '99px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
    borderRadius: '99px',
    transition: 'width 0.3s ease',
  },
  abortButton: {
    marginTop: '12px',
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '6px 14px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.82rem',
  },
  successContainer: {
    textAlign: 'center',
    padding: '32px 24px',
    background: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #166534',
  },
  successIcon: {
    fontSize: '2.5rem',
    marginBottom: '12px',
  },
  successTitle: {
    color: '#86efac',
    fontWeight: 700,
    fontSize: '1.05rem',
    margin: '0 0 12px 0',
  },
  successLink: {
    display: 'inline-block',
    color: '#818cf8',
    textDecoration: 'none',
    marginBottom: '16px',
    fontSize: '0.9rem',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '20px',
    background: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #7f1d1d',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: '0.9rem',
    margin: '0 0 12px 0',
  },
  gateContainer: {
    textAlign: 'center',
    padding: '40px 24px',
    background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
    borderRadius: '16px',
    border: '1px solid #312e81',
  },
  gateLock: {
    fontSize: '2.5rem',
    marginBottom: '16px',
  },
  gateTitle: {
    color: '#e2e8f0',
    fontWeight: 700,
    fontSize: '1.2rem',
    margin: '0 0 10px 0',
  },
  gateDescription: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    margin: '0 0 24px 0',
  },
  upgradeButton: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 28px',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    flex: 1,
  },
  secondaryButton: {
    background: 'transparent',
    color: '#64748b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 16px',
    fontWeight: 500,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
};
