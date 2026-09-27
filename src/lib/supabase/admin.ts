// lib/supabase/admin.ts
// Server-only Supabase client with SERVICE ROLE key (admin privileges).
// Never import this in client components.

import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { AppSupabaseClient } from '@/lib/supabase/types';

// Cache instance across HMR in dev
declare global {
   
  var __supabase_admin__: AppSupabaseClient | undefined;
}

export function getSupabaseAdmin(): AppSupabaseClient {
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
    }) as AppSupabaseClient;
  }
  return globalThis.__supabase_admin__!;
}

export type { AppSupabaseClient };
