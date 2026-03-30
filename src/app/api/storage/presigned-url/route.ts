// src/app/api/storage/presigned-url/route.ts
// API Route (Next.js App Router) — Solo POST.
// 1) Verifica sesión Supabase SSR.
// 2) Verifica que el usuario tiene el add-on de Storage activo.
// 3) Genera una Presigned URL de PUT (válida 5 min) para subir directo a R2.
// 4) Devuelve la URL + la clave del objeto en R2.

import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getR2, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2/client';
import { hasStorageAddon } from '@/lib/r2/hasStorageAddon';

// Tipos MIME permitidos
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
]);

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

export interface PresignedUrlRequest {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  /** Contexto opcional: a qué match/player pertenece el archivo */
  matchId?: string;
  playerId?: string;
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  objectKey: string;
  publicUrl: string | null;
  expiresAt: string; // ISO string
}

export async function POST(req: NextRequest) {
  // --- 1. Sesión ---
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // --- 2. Verificar add-on de Storage ---
  const hasAddon = await hasStorageAddon(supabase, user.id);
  if (!hasAddon) {
    return NextResponse.json(
      {
        error: 'storage_addon_required',
        message: 'Necesitas activar el add-on de almacenamiento en la nube para usar esta función.',
      },
      { status: 403 }
    );
  }

  // --- 3. Validar body ---
  let body: PresignedUrlRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { fileName, contentType, sizeBytes, matchId, playerId } = body;

  if (!fileName || !contentType || !sizeBytes) {
    return NextResponse.json(
      { error: 'Se requieren fileName, contentType y sizeBytes' },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: `Tipo de archivo no permitido: ${contentType}` },
      { status: 400 }
    );
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'El archivo supera el límite de 500 MB' },
      { status: 400 }
    );
  }

  // --- 4. Construir la clave del objeto en R2 ---
  // Estructura: {userId}/matches/{matchId}/{timestamp}-{safeFileName}
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectKey = matchId
    ? `${user.id}/matches/${matchId}/${timestamp}-${safeFileName}`
    : `${user.id}/uploads/${timestamp}-${safeFileName}`;

  // --- 5. Generar Presigned URL ---
  try {
    const r2 = getR2();
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey,
      ContentType: contentType,
      ContentLength: sizeBytes,
      // Metadatos opcionales que se guardan en R2
      Metadata: {
        'uploaded-by': user.id,
        ...(matchId ? { 'match-id': matchId } : {}),
        ...(playerId ? { 'player-id': playerId } : {}),
      },
    });

    const expiresIn = 300; // 5 minutos
    const presignedUrl = await getSignedUrl(r2, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL.replace(/\/$/, '')}/${objectKey}`
      : null;

    const response: PresignedUrlResponse = {
      presignedUrl,
      objectKey,
      publicUrl,
      expiresAt,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error('[presigned-url] Error generating presigned URL:', err);
    return NextResponse.json(
      { error: 'Error interno al generar la URL de subida' },
      { status: 500 }
    );
  }
}
