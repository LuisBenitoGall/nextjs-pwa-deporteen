'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton para evitar múltiples instancias con HMR
let _client: SupabaseClient | null = null;

/**
 * Devuelve el cliente de Supabase para el navegador.
 * Solo usar en componentes cliente.
 */
export function supabaseBrowser(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('[Supabase Browser] Falta NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!anon) {
    throw new Error('[Supabase Browser] Falta NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  _client = createBrowserClient(url, anon);
  return _client;
}

/**
 * Export por compatibilidad con el código existente:
 * import { supabase } from '@/lib/supabase/client'
 */
export const supabase = supabaseBrowser();
