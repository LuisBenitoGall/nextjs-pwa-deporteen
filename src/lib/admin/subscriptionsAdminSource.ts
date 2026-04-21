import type { SupabaseClient } from '@supabase/supabase-js';

export type AdminSubscriptionsSource = 'storage' | 'legacy';

function relationMissing(error: unknown, relation: string): boolean {
  const message = String((error as any)?.message || '').toLowerCase();
  return message.includes('does not exist') && message.includes(relation.toLowerCase());
}

export async function detectAdminSubscriptionsSource(
  supabase: SupabaseClient
): Promise<AdminSubscriptionsSource> {
  const { error } = await supabase
    .from('storage_subscriptions')
    .select('id', { head: true, count: 'exact' });

  if (error && relationMissing(error, 'storage_subscriptions')) {
    return 'legacy';
  }
  return 'storage';
}
