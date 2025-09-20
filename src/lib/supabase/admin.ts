// lib/supabase/admin.ts
// Server-only Supabase client with SERVICE ROLE key (admin privileges).
// Never import this in client components.

import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Cache instance across HMR in dev
declare global {
  // eslint-disable-next-line no-var
  var __supabase_admin__: SupabaseClient | undefined;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('[Supabase Admin] No se puede usar en el cliente');
  }

  if (!globalThis.__supabase_admin__) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url) throw new Error('[Supabase Admin] Falta NEXT_PUBLIC_SUPABASE_URL');
    if (!serviceKey) throw new Error('[Supabase Admin] Falta SUPABASE_SERVICE_ROLE_KEY');

    globalThis.__supabase_admin__ = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'X-Client-Info': 'deporteen-admin' } },
    });
  }
  return globalThis.__supabase_admin__!;
}

export const supabaseAdmin = getSupabaseAdmin();
export type { SupabaseClient };
