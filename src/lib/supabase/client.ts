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

  _client = createBrowserClient(url, anon, {
    cookies: {
      get(name: string) {
        if (typeof document === 'undefined') return undefined;
        try {
          const match = (document.cookie || '')
            .split('; ')
            .find((row) => row.startsWith(name + '='));
          return match ? decodeURIComponent(match.split('=')[1]) : undefined;
        } catch {
          return undefined;
        }
      },
      set(name: string, value: string, options?: any) {
        if (typeof document === 'undefined') return;
        try {
          let cookie = `${name}=${encodeURIComponent(value)}; path=${options?.path ?? '/'}`;
          if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
          if (options?.expires) cookie += `; expires=${new Date(options.expires).toUTCString()}`;
          if (options?.domain) cookie += `; domain=${options.domain}`;
          if (options?.sameSite) cookie += `; samesite=${options.sameSite}`;
          if (options?.secure) cookie += `; secure`;
          document.cookie = cookie;
        } catch {}
      },
      remove(name: string, options?: any) {
        if (typeof document === 'undefined') return;
        try {
          document.cookie = `${name}=; Max-Age=0; path=${options?.path ?? '/'}`;
        } catch {}
      },
    },
  });
  return _client;
}

/**
 * Export por compatibilidad con el código existente:
 * import { supabase } from '@/lib/supabase/client'
 */
export const supabase = supabaseBrowser();
