// Server-safe barrel para Supabase.
// IMPORTANTE: no reexportar el cliente del navegador desde aquí
// para evitar que "use client" se cuele en módulos de servidor.
// En componentes cliente importa SIEMPRE desde './client' directamente.

export { createClient as createSupabaseServerClient } from './server';
export { getSupabaseAdmin, supabaseAdmin } from './admin';

// Tipos útiles (opcionales; no arrastran cliente)
export type { SupabaseClient } from '@supabase/supabase-js';
