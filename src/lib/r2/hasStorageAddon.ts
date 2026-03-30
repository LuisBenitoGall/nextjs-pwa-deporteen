// src/lib/r2/hasStorageAddon.ts
// Verifica si el usuario tiene el add-on de Cloudflare R2 Storage activo.
// El add-on se registra en la tabla `storage_addons` de Supabase
// (creada por la migración SQL incluida en /migrations/).
// Esta función solo se usa en el servidor (API Routes).

import { SupabaseServerClient } from '@/lib/stripe-customer';

/**
 * Devuelve true si el usuario tiene el add-on de Storage activo.
 * Los posibles estados de activación son:
 *   - 'active'   → pago one-time confirmado por webhook de Stripe
 *   - 'trialing' → período de prueba concedido manualmente
 */
export async function hasStorageAddon(
  supabase: SupabaseServerClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('storage_addons')
    .select('status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('[hasStorageAddon] Error querying storage_addons:', error.message);
    return false;
  }

  return data !== null;
}
