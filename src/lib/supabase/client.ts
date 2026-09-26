'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('[Supabase Browser] Falta NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!anon) {
    throw new Error('[Supabase Browser] Falta NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createBrowserClient(url, anon, {
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
      set(name: string, value: string, options?: Record<string, unknown>) {
        if (typeof document === 'undefined') return;
        try {
          let cookie = `${name}=${encodeURIComponent(value)}; path=${(options?.path as string) ?? '/'}`;
          if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
          if (options?.expires) cookie += `; expires=${new Date(options.expires as string).toUTCString()}`;
          if (options?.domain) cookie += `; domain=${options.domain}`;
          if (options?.sameSite) cookie += `; samesite=${options.sameSite}`;
          if (options?.secure) cookie += `; secure`;
          document.cookie = cookie;
        } catch {
          /* ignore */
        }
      },
      remove(name: string, options?: Record<string, unknown>) {
        if (typeof document === 'undefined') return;
        try {
          document.cookie = `${name}=; Max-Age=0; path=${(options?.path as string) ?? '/'}`;
        } catch {
          /* ignore */
        }
      },
    },
  });
}

/**
 * Cliente Supabase para el navegador (singleton). No se instancia hasta el primer uso.
 */
export function supabaseBrowser(): SupabaseClient {
  if (!_client) _client = createClient();
  return _client;
}

/**
 * Compatibilidad: acceso perezoso para no exigir env al importar el módulo (CRIT-12 / BAJO-13).
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = supabaseBrowser();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

export type { SupabaseClient };
