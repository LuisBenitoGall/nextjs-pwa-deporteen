// src/app/api/storage/addon-status/route.ts
// Endpoint GET ligero que devuelve si el usuario autenticado tiene el add-on de R2 activo.
// Lo usan los componentes client-side para mostrar/ocultar el gate de pago.

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasStorageAddon } from '@/lib/r2/hasStorageAddon';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ hasAddon: false }, { status: 401 });
  }

  const hasAddon = await hasStorageAddon(supabase, user.id);
  return NextResponse.json({ hasAddon });
}
