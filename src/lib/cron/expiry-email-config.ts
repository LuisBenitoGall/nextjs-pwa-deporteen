import type { NextRequest } from 'next/server';

export type ExpiryEmailRunMode = 'live' | 'dry_run' | 'backfill';

export type ExpiryEmailRunConfig = {
  mode: ExpiryEmailRunMode;
  /** Máximo de envíos o marcas backfill por ejecución (live/backfill). */
  maxPerRun: number;
  /** Entradas de vista previa en JSON (dry_run). */
  previewLimit: number;
};

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function parseExpiryEmailRunConfig(req?: NextRequest): ExpiryEmailRunConfig {
  const modeParam = req?.nextUrl.searchParams.get('mode')?.trim().toLowerCase();
  let mode: ExpiryEmailRunMode = 'live';
  if (modeParam === 'live') mode = 'live';
  else if (modeParam === 'dry_run' || modeParam === 'dry-run') mode = 'dry_run';
  else if (modeParam === 'backfill') mode = 'backfill';
  else if (process.env.SUBSCRIPTION_EXPIRY_EMAIL_DRY_RUN === 'true') mode = 'dry_run';

  return {
    mode,
    maxPerRun: parsePositiveInt(process.env.SUBSCRIPTION_EXPIRY_EMAIL_MAX_PER_RUN, 25),
    previewLimit: parsePositiveInt(process.env.SUBSCRIPTION_EXPIRY_EMAIL_PREVIEW_LIMIT, 100),
  };
}
