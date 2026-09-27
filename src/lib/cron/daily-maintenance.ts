import 'server-only';
import { SUBSCRIPTION_EXPIRY_NOTICE_DAYS } from '@/config/constants';
import { MS_PER_DAY } from '@/lib/subscriptions/expiry-notices';
import { cookieConsentRetentionCutoffIso } from '@/lib/cookie-consent';
import { buildSubscriptionExpiryEmail } from '@/lib/email/subscription-expiry-template';
import { sendHtmlEmail, getResendConfig } from '@/lib/email/resend';
import {
  buildNotifiedExpiryEmailUpdate,
  pickSubscriptionExpiryEmailCandidate,
  type UserSubscriptionBundle,
} from '@/lib/subscriptions/expiry-email';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type DailyCronResult = {
  ok: boolean;
  at: string;
  resendConfigured: boolean;
  expiryEmails: {
    candidates: number;
    sent: number;
    skippedAlreadyNotified: number;
    failed: number;
    notConfigured: boolean;
  };
  cookiePurge: {
    deleted: number;
    cutoff: string;
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

export async function runDailyMaintenanceCron(now: Date = new Date()): Promise<DailyCronResult> {
  const errors: string[] = [];
  const resendConfigured = getResendConfig() != null;
  let admin: ReturnType<typeof getSupabaseAdmin>;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Supabase admin no disponible';
    return {
      ok: false,
      at: now.toISOString(),
      resendConfigured,
      expiryEmails: {
        candidates: 0,
        sent: 0,
        skippedAlreadyNotified: 0,
        failed: 0,
        notConfigured: !resendConfigured,
      },
      cookiePurge: { deleted: 0, cutoff: cookieConsentRetentionCutoffIso(now) },
      errors: [message],
    };
  }

  const expiryStats = {
    candidates: 0,
    sent: 0,
    skippedAlreadyNotified: 0,
    failed: 0,
    notConfigured: !resendConfigured,
  };

  const maxWindow = SUBSCRIPTION_EXPIRY_NOTICE_DAYS[SUBSCRIPTION_EXPIRY_NOTICE_DAYS.length - 1];
  const horizon = new Date(now.getTime() + maxWindow * MS_PER_DAY);

  const { data: subs, error: subsErr } = await admin
    .from('subscriptions')
    .select('id, user_id, current_period_end, status, notified_expiry_email')
    .in('status', ['active', 'trialing'])
    .gte('current_period_end', now.toISOString())
    .lte('current_period_end', horizon.toISOString());

  if (subsErr) {
    errors.push(`subscriptions: ${subsErr.message}`);
  } else if (subs?.length) {
    const byUser = new Map<string, UserSubscriptionBundle['subs']>();
    for (const row of subs) {
      const list = byUser.get(row.user_id) ?? [];
      list.push({
        id: row.id,
        status: row.status,
        current_period_end: row.current_period_end,
        notified_expiry_email: row.notified_expiry_email,
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
    } else {
      const renewBase = siteBaseUrl();
      if (!renewBase) {
        errors.push('Falta NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_APP_URL o VERCEL_URL para enlaces de renovación');
      }
      const renewUrl = renewBase ? `${renewBase}/billing/renew` : '#';

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
        expiryStats.candidates += 1;

        const endDate = new Date(candidate.periodEndIso);
        const { subject, html } = buildSubscriptionExpiryEmail({
          locale: candidate.locale,
          recipientName: candidate.name,
          daysLeft: candidate.daysLeft,
          endDate,
          renewUrl,
        });

        const sendResult = await sendHtmlEmail({
          to: candidate.email,
          subject,
          html,
        });

        if (!sendResult.ok) {
          if (sendResult.code === 'not_configured') {
            expiryStats.notConfigured = true;
          } else {
            expiryStats.failed += 1;
            errors.push(`email ${candidate.email}: ${sendResult.message}`);
          }
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
          expiryStats.failed += 1;
          errors.push(`update notified_expiry_email ${candidate.subscriptionId}: ${updErr.message}`);
        } else {
          expiryStats.sent += 1;
        }
      }
    }
  }

  const cutoff = cookieConsentRetentionCutoffIso(now);
  const { count, error: delErr } = await admin
    .from('cookie_consents')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff);

  if (delErr) {
    errors.push(`cookie_consents purge: ${delErr.message}`);
  }

  return {
    ok: errors.length === 0,
    at: now.toISOString(),
    resendConfigured,
    expiryEmails: expiryStats,
    cookiePurge: { deleted: count ?? 0, cutoff },
    errors,
  };
}
