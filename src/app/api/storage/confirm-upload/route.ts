// src/app/api/storage/confirm-upload/route.ts
// Llamado por el frontend DESPUÉS de que el PUT a R2 haya sido exitoso.
// Registra el asset en la tabla `match_media` de Supabase para tenerlo indexado.

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasStorageAddon } from '@/lib/r2/hasStorageAddon';

export interface ConfirmUploadRequest {
  objectKey: string;
  publicUrl: string | null;
  matchId: string;
  playerId?: string | null;
  contentType: string;
  sizeBytes: number;
  kind: 'photo' | 'video' | 'file';
}

export async function POST(req: NextRequest) {
  // --- 1. Sesión ---
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // --- 2. Double-check add-on (seguridad en profundidad) ---
  const hasAddon = await hasStorageAddon(supabase, user.id);
  if (!hasAddon) {
    return NextResponse.json({ error: 'storage_addon_required' }, { status: 403 });
  }

  // --- 3. Validar body ---
  let body: ConfirmUploadRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { objectKey, publicUrl, matchId, playerId, contentType, sizeBytes, kind } = body;

  if (!objectKey || !matchId || !contentType || !sizeBytes || !kind) {
    return NextResponse.json(
      { error: 'Faltan campos requeridos: objectKey, matchId, contentType, sizeBytes, kind' },
      { status: 400 }
    );
  }

  // --- 4. Insertar en match_media ---
  const { data, error } = await supabase
    .from('match_media')
    .insert({
      user_id: user.id,
      match_id: matchId,
      player_id: playerId ?? null,
      kind,
      // storage_path guarda la clave del objeto en R2 (misma columna que para Supabase Storage)
      storage_path: objectKey,
      mime_type: contentType,
      size_bytes: sizeBytes,
      taken_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[confirm-upload] Supabase insert error:', error.message);
    return NextResponse.json(
      { error: 'Error al registrar el archivo en la base de datos' },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id, objectKey, publicUrl }, { status: 201 });
}
