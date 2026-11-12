import type { AppSupabaseClient } from '@/lib/supabase/types';
import type { Json } from '@/lib/database.types';

export async function writeAdminAuditLog(
  supabase: AppSupabaseClient,
  entry: {
    actor_user_id: string;
    target_user_id: string;
    action: string;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from('admin_audit_log').insert({
    actor_user_id: entry.actor_user_id,
    target_user_id: entry.target_user_id,
    action: entry.action,
    payload: entry.payload as Json,
  });
  if (error) {
    console.error('[admin_audit_log] insert failed', error.message);
  }
}
