import 'server-only';

import type { AppSupabaseClient } from '@/lib/supabase/types';
import { getActiveCloudPlanGb } from '@/lib/cloud/usage';

export async function hasActiveStorageSubscription(
  supabase: AppSupabaseClient,
  userId: string
): Promise<boolean> {
  const planGb = await getActiveCloudPlanGb(supabase, userId);
  return planGb > 0;
}
