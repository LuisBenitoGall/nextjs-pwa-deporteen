import 'server-only';
import { cookieConsentRetentionCutoffIso } from '@/lib/cookie-consent';
import { parseExpiryEmailRunConfig, type ExpiryEmailRunConfig } from '@/lib/cron/expiry-email-config';
import { runExpiryEmailBatch } from '@/lib/cron/expiry-email-run';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { NextRequest } from 'next/server';

export type DailyCronResult = {
  ok: boolean;
  at: string;
  resendConfigured: boolean;
  expiryEmails: Awaited<ReturnType<typeof runExpiryEmailBatch>>['result'];
  cookiePurge: {
    deleted: number;
    cutoff: string;
    skippedDryRun: boolean;
  };
  errors: string[];
};

function siteBaseUrl(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (!raw) return null;
  if (raw.startsWith('http')) return raw.replace(/\/$/, '');
  return `https://${raw.replace(/\/$/, '')}`;
}

export async function runDailyMaintenanceCron(
  now: Date = new Date(),
  req?: NextRequest,
): Promise<DailyCronResult> {
  const errors: string[] = [];
  const emailConfig: ExpiryEmailRunConfig = parseExpiryEmailRunConfig(req);
  const resendConfigured = process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim();

  let admin: ReturnType<typeof getSupabaseAdmin>;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Supabase admin no disponible';
    return {
      ok: false,
      at: now.toISOString(),
      resendConfigured: !!resendConfigured,
      expiryEmails: {
        mode: emailConfig.mode,
        maxPerRun: emailConfig.maxPerRun,
        candidates: 0,
        processed: 0,
        sent: 0,
        backfilled: 0,
        capped: 0,
        failed: 0,
        notConfigured: !resendConfigured,
        preview: [],
      },
      cookiePurge: { deleted: 0, cutoff: cookieConsentRetentionCutoffIso(now), skippedDryRun: false },
      errors: [message],
    };
  }

  const renewBase = siteBaseUrl();
  if (!renewBase && emailConfig.mode === 'live') {
    errors.push('Falta NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_APP_URL o VERCEL_URL para enlaces de renovación');
  }
  const renewUrl = renewBase ? `${renewBase}/billing/renew` : '#';

  const { result: expiryEmails, errors: emailErrors } = await runExpiryEmailBatch(
    admin,
    now,
    renewUrl,
    emailConfig,
  );
  errors.push(...emailErrors);

  const cutoff = cookieConsentRetentionCutoffIso(now);
  let deleted = 0;
  const skipPurge = emailConfig.mode === 'dry_run';
  if (!skipPurge) {
    const { count, error: delErr } = await admin
      .from('cookie_consents')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff);
    if (delErr) errors.push(`cookie_consents purge: ${delErr.message}`);
    else deleted = count ?? 0;
  }

  return {
    ok: errors.length === 0,
    at: now.toISOString(),
    resendConfigured: !!resendConfigured,
    expiryEmails,
    cookiePurge: { deleted, cutoff, skippedDryRun: skipPurge },
    errors,
  };
}
