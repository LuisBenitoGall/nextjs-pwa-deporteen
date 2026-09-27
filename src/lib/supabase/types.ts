import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

/** Cliente Supabase alineado con el esquema `public` regenerado en `database.types.ts`. */
export type AppSupabaseClient = SupabaseClient<Database, 'public'>;
