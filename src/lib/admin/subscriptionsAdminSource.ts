import type { SupabaseClient } from '@supabase/supabase-js';

export type AdminSubscriptionsSource = 'storage' | 'legacy';

function relationMissing(error: unknown, relation: string): boolean {
  const message = String((error as any)?.message || '').toLowerCase();
  return message.includes('does not exist') && message.includes(relation.toLowerCase());
}

/**
 * Elige la fuente de datos del panel admin.
 *
 * Importante: en algunos entornos existe `storage_subscriptions` (tabla creada por migración)
 * pero vacía, mientras que el histórico real sigue en `subscriptions`. Si solo comprobamos
 * existencia de la tabla, el listado queda vacío. Por eso usamos conteos.
 */
export async function detectAdminSubscriptionsSource(
  supabase: SupabaseClient
): Promise<AdminSubscriptionsSource> {
  const storageProbe = await supabase
    .from('storage_subscriptions')
    .select('id', { head: true, count: 'exact' });

  if (storageProbe.error && relationMissing(storageProbe.error, 'storage_subscriptions')) {
    return 'legacy';
  }

  const storageCount = storageProbe.count ?? 0;

  const legacyProbe = await supabase
    .from('subscriptions')
    .select('id', { head: true, count: 'exact' });

  if (legacyProbe.error && relationMissing(legacyProbe.error, 'subscriptions')) {
    return 'storage';
  }

  const legacyCount = legacyProbe.count ?? 0;

  if (storageCount > 0) {
    return 'storage';
  }

  if (legacyCount > 0) {
    return 'legacy';
  }

  return 'storage';
}
