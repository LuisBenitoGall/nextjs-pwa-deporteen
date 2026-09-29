import { SUBSCRIPTION_EXPIRY_NOTICE_DAYS } from '@/config/constants';
import { MS_PER_DAY } from '@/lib/subscriptions/expiry-notices';
import { buildSubscriptionExpiryEmail } from '@/lib/email/subscription-expiry-template';
import { sendHtmlEmail, getResendConfig } from '@/lib/email/resend';
import {
  buildNotifiedExpiryEmailUpdate,
  pickSubscriptionExpiryEmailCandidate,
  type SubscriptionExpiryEmailCandidate,
  type UserSubscriptionBundle,
} from '@/lib/subscriptions/expiry-email';
import type { AppSupabaseClient } from '@/lib/supabase/admin';
import type { ExpiryEmailRunConfig } from '@/lib/cron/expiry-email-config';

export type ExpiryEmailPreviewRow = {
  userId: string;
  email: string;
  subscriptionId: string;
  noticeThresholdDays: number;
  daysLeft: number;
  periodEnd: string;
};

export type ExpiryEmailRunResult = {
  mode: ExpiryEmailRunConfig['mode'];
  maxPerRun: number;
  candidates: number;
  processed: number;
  sent: number;
  backfilled: number;
  capped: number;
  failed: number;
  notConfigured: boolean;
  preview: ExpiryEmailPreviewRow[];
};

type SubRow = {
  id: string;
  user_id: string;
  current_period_end: string | null;
  status: string | null;
  notified_expiry_email: unknown;
  subscription_plans: { days: number } | { days: number }[] | null;
};

function planDaysFromRow(row: SubRow): number | null {
  const p = row.subscription_plans;
  if (!p) return null;
  if (Array.isArray(p)) return p[0]?.days ?? null;
  return p.days ?? null;
}

export async function runExpiryEmailBatch(
  admin: AppSupabaseClient,
  now: Date,
  renewUrl: string,
  config: ExpiryEmailRunConfig,
): Promise<{ result: ExpiryEmailRunResult; errors: string[] }> {
  const errors: string[] = [];
  const resendConfigured = getResendConfig() != null;
  const result: ExpiryEmailRunResult = {
    mode: config.mode,
    maxPerRun: config.maxPerRun,
    candidates: 0,
    processed: 0,
    sent: 0,
    backfilled: 0,
    capped: 0,
    failed: 0,
    notConfigured: !resendConfigured && config.mode === 'live',
    preview: [],
  };

  const maxWindow = SUBSCRIPTION_EXPIRY_NOTICE_DAYS[SUBSCRIPTION_EXPIRY_NOTICE_DAYS.length - 1];
  const horizon = new Date(now.getTime() + maxWindow * MS_PER_DAY);

  const { data: subs, error: subsErr } = await admin
    .from('subscriptions')
    .select(
      'id, user_id, current_period_end, status, notified_expiry_email, subscription_plans ( days )',
    )
    .in('status', ['active', 'trialing'])
    .gte('current_period_end', now.toISOString())
    .lte('current_period_end', horizon.toISOString());

  if (subsErr) {
    errors.push(`subscriptions: ${subsErr.message}`);
    return { result, errors };
  }
  if (!subs?.length) return { result, errors };

  const byUser = new Map<string, UserSubscriptionBundle['subs']>();
  for (const row of subs as SubRow[]) {
    const list = byUser.get(row.user_id) ?? [];
    list.push({
      id: row.id,
      status: row.status,
      current_period_end: row.current_period_end,
      notified_expiry_email: row.notified_expiry_email,
      plan_days: planDaysFromRow(row),
    });
    byUser.set(row.user_id, list);
  }

  const userIds = [...byUser.keys()];
  const { data: users, error: usersErr } = await admin
    .from('users')
    .select('id, email, locale, name')
    .in('id', userIds);

  if (usersErr) {
    errors.push(`users: ${usersErr.message}`);
    return { result, errors };
  }

  const pending: { bundle: UserSubscriptionBundle; candidate: SubscriptionExpiryEmailCandidate }[] =
    [];

  for (const user of users ?? []) {
    if (!user.email) continue;
    const bundle: UserSubscriptionBundle = {
      userId: user.id,
      email: user.email,
      locale: user.locale,
      name: user.name,
      subs: byUser.get(user.id) ?? [],
    };
    const candidate = pickSubscriptionExpiryEmailCandidate(bundle, now);
    if (!candidate) continue;
    pending.push({ bundle, candidate });
  }

  pending.sort((a, b) => a.candidate.daysLeft - b.candidate.daysLeft);
  result.candidates = pending.length;

  for (const { bundle, candidate } of pending) {
    const previewRow: ExpiryEmailPreviewRow = {
      userId: candidate.userId,
      email: candidate.email,
      subscriptionId: candidate.subscriptionId,
      noticeThresholdDays: candidate.noticeThresholdDays,
      daysLeft: candidate.daysLeft,
      periodEnd: candidate.periodEndIso,
    };

    if (config.mode === 'dry_run') {
      if (result.preview.length < config.previewLimit) result.preview.push(previewRow);
      continue;
    }

    if (result.processed >= config.maxPerRun) {
      result.capped += 1;
      continue;
    }

    result.processed += 1;

    if (config.mode === 'backfill') {
      const subRow = bundle.subs.find((s) => s.id === candidate.subscriptionId);
      const nextState = buildNotifiedExpiryEmailUpdate(
        candidate.periodEndIso,
        subRow?.notified_expiry_email,
        candidate.noticeThresholdDays,
      );
      const { error: updErr } = await admin
        .from('subscriptions')
        .update({ notified_expiry_email: nextState })
        .eq('id', candidate.subscriptionId);
      if (updErr) {
        result.failed += 1;
        errors.push(`backfill ${candidate.subscriptionId}: ${updErr.message}`);
      } else {
        result.backfilled += 1;
      }
      continue;
    }

    // live
    if (!resendConfigured) {
      result.notConfigured = true;
      continue;
    }

    const endDate = new Date(candidate.periodEndIso);
    const { subject, html } = buildSubscriptionExpiryEmail({
      locale: candidate.locale,
      recipientName: candidate.name,
      daysLeft: candidate.daysLeft,
      endDate,
      renewUrl,
    });

    const sendResult = await sendHtmlEmail({ to: candidate.email, subject, html });
    if (!sendResult.ok) {
      result.failed += 1;
      errors.push(`email ${candidate.email}: ${sendResult.message}`);
      continue;
    }

    const subRow = bundle.subs.find((s) => s.id === candidate.subscriptionId);
    const nextState = buildNotifiedExpiryEmailUpdate(
      candidate.periodEndIso,
      subRow?.notified_expiry_email,
      candidate.noticeThresholdDays,
    );

    const { error: updErr } = await admin
      .from('subscriptions')
      .update({ notified_expiry_email: nextState })
      .eq('id', candidate.subscriptionId);

    if (updErr) {
      result.failed += 1;
      errors.push(`update notified_expiry_email ${candidate.subscriptionId}: ${updErr.message}`);
    } else {
      result.sent += 1;
    }
  }

  return { result, errors };
}
