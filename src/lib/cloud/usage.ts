import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { BYTES_PER_GB } from '@/lib/cloud/guardrails';
type AppSupabase = SupabaseClient;

export type CloudUsageSnapshot = {
  bytes_used: number;
  bytes_quota: number;
  bytes_remaining: number;
  percentage_used: number;
  plan_gb: number;
};

export async function getActiveCloudPlanGb(supabase: AppSupabase, userId: string): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from('storage_subscriptions')
    .select('gb_amount,current_period_end,status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('current_period_end', nowIso)
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = data as { gb_amount?: number } | null;
  return row?.gb_amount ?? 0;
}

export async function getCloudBytesUsed(supabase: AppSupabase, userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('match_media')
    .select('size_bytes')
    .eq('user_id', userId)
    .eq('storage_provider', 'r2');

  if (error || !data) return 0;
  return (data as Array<{ size_bytes?: number | null }>).reduce(
    (sum, row) => sum + (row.size_bytes ?? 0),
    0
  );
}

export async function getCloudUsage(supabase: AppSupabase, userId: string): Promise<CloudUsageSnapshot> {
  const [planGb, bytesUsed] = await Promise.all([
    getActiveCloudPlanGb(supabase, userId),
    getCloudBytesUsed(supabase, userId),
  ]);

  const bytesQuota = Math.max(0, planGb * BYTES_PER_GB);
  const bytesRemaining = Math.max(0, bytesQuota - bytesUsed);
  const percentageUsed = bytesQuota > 0 ? Math.min(100, (bytesUsed / bytesQuota) * 100) : 0;

  return {
    bytes_used: bytesUsed,
    bytes_quota: bytesQuota,
    bytes_remaining: bytesRemaining,
    percentage_used: Number(percentageUsed.toFixed(2)),
    plan_gb: planGb,
  };
}
