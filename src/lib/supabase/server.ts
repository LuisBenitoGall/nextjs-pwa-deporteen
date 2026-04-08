// lib/supabase/server.ts
// Server-only helpers para Supabase con App Router (Next.js 13+).
// - createSupabaseServerClient(): client con cookies de sesión (SSR).
// - getServerAnon(): client ANON sin cookies (scripts/server).

import 'server-only';
import { createClient as createPublicClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

function requireSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error('[Supabase Server] Falta NEXT_PUBLIC_SUPABASE_URL');
  if (!anon) throw new Error('[Supabase Server] Falta NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return { url, anon };
}

// Cliente SOLO-LECTURA para usar en Server Components (layouts, páginas, loaders).
export async function createSupabaseServerClientReadOnly(): Promise<SupabaseClient> {
  const { url, anon } = requireSupabaseEnv();
  const jar = await cookies(); // Next.js 15: async
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return jar.get(name)?.value;
      },
      set() {},     // no-op: prohibido escribir cookies en render
      remove() {},  // no-op
    },
  });
}

/**
 * Crea un Supabase client "consciente" de cookies de sesión en SSR.
 * Úsalo en Server Components, Server Actions y Route Handlers (runtime nodejs).
 *
 * Nota: no cachees el resultado globalmente; las cookies son por-request.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const { url, anon } = requireSupabaseEnv();
  const jar = await cookies(); // Next.js 15: APIs dinámicas son async

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return jar.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        jar.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        jar.set({ name, value: '', ...options });
      },
    },
  });
}

/**
 * Client público ANON sin cookies. Útil para scripts/server que no requieren sesión
 * ni privilegios de admin (p. ej., lecturas públicas con RLS = anon).
 */
export function getServerAnon(): SupabaseClient {
  const { url, anon } = requireSupabaseEnv();
  return createPublicClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'deporteen-server-anon' } },
  });
}

/** Helper opcional: obtener el usuario actual en servidor. */
export async function getServerUser() {
  const supabase = await createSupabaseServerClientReadOnly(); // ← aquí el cambio
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user: error ? null : user };
}

export type { SupabaseClient };
