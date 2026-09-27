// Server-safe barrel para Supabase.
// IMPORTANTE: no reexportar el cliente del navegador desde aquí
// para evitar que "use client" se cuele en módulos de servidor.
// En componentes cliente importa SIEMPRE desde './client' directamente.

export { createSupabaseServerClient } from './server';
export { getSupabaseAdmin } from './admin';

export type { AppSupabaseClient } from './types';
