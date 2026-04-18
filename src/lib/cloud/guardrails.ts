export const BYTES_PER_GB = 1024 ** 3;

/**
 * Límite absoluto por archivo de vídeo en CLOUD (R2).
 * 250 MB reduce picos de coste/latencia y mantiene una UX razonable.
 */
export const MAX_VIDEO_FILE_BYTES = 250 * 1024 * 1024;

export const CLOUD_USAGE_THRESHOLDS = {
  info70: 70,
  warn85: 85,
  block95: 95,
  full100: 100,
} as const;

/**
 * Política de duración máxima de vídeo por plan cloud (segundos).
 * 10/50/200 GB -> 60/180/600 s.
 */
export function getMaxVideoDurationSeconds(planGb: number): number {
  if (planGb >= 200) return 600;
  if (planGb >= 50) return 180;
  return 60;
}

export type CloudUsageLevel = 'ok' | 'info70' | 'warn85' | 'warn95' | 'full100';

export function getCloudUsageLevel(percentageUsed: number): CloudUsageLevel {
  if (percentageUsed >= CLOUD_USAGE_THRESHOLDS.full100) return 'full100';
  if (percentageUsed >= CLOUD_USAGE_THRESHOLDS.block95) return 'warn95';
  if (percentageUsed >= CLOUD_USAGE_THRESHOLDS.warn85) return 'warn85';
  if (percentageUsed >= CLOUD_USAGE_THRESHOLDS.info70) return 'info70';
  return 'ok';
}

export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  const fixed = size >= 100 || idx === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(fixed)} ${units[idx]}`;
}

export function hasQuotaForUpload(bytesUsed: number, bytesQuota: number, fileSize: number): boolean {
  return bytesUsed + fileSize <= bytesQuota;
}

export function isVideoSizeAllowed(fileSize: number): boolean {
  return fileSize <= MAX_VIDEO_FILE_BYTES;
}

export function isVideoDurationAllowed(durationSeconds: number, planGb: number): boolean {
  return durationSeconds <= getMaxVideoDurationSeconds(planGb);
}

export async function readVideoDurationSeconds(file: File): Promise<number | null> {
  if (!file.type.startsWith('video/')) return null;
  return new Promise<number | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const cleanup = () => URL.revokeObjectURL(url);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const seconds = Number.isFinite(video.duration) ? Math.round(video.duration) : null;
      cleanup();
      resolve(seconds);
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    video.src = url;
  });
}
