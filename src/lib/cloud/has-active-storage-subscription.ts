import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getActiveCloudPlanGb } from '@/lib/cloud/usage';

export async function hasActiveStorageSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const planGb = await getActiveCloudPlanGb(supabase, userId);
  return planGb > 0;
}
