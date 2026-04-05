// src/lib/uploadToProvider.ts
// Router de subida: enruta al proveedor correcto según la preferencia del usuario.
// Devuelve los campos a guardar en match_media.
import { idbPut } from '@/lib/mediaLocal';
import { guessExt } from '@/lib/uploadMatchMedia';
import { supabase } from '@/lib/supabase/client';
import type { StorageProvider } from '@/hooks/useStorageProvider';

export type UploadResult = {
    storage_provider: StorageProvider;
    storage_path: string | null;       // Supabase Storage path o R2 path
    device_uri: string | null;         // clave IndexedDB
    google_drive_file_id: string | null;
};

type UploadParams = {
    file: File;
    provider: StorageProvider;
    matchId: string;
    playerId?: string | null;
    /** Access token de Google (requerido si provider === 'drive') */
    googleAccessToken?: string | null;
};

// ─── Local (IndexedDB) ───────────────────────────────────────────────────────

async function uploadLocal(file: File, matchId: string): Promise<UploadResult> {
    const mediaId = crypto.randomUUID();
    const deviceKey = `media:${mediaId}`;
    await idbPut(deviceKey, file);
    return {
        storage_provider: 'local',
        storage_path: null,
        device_uri: deviceKey,
        google_drive_file_id: null,
    };
}

// ─── Supabase Storage ────────────────────────────────────────────────────────

async function uploadSupabase(file: File, matchId: string): Promise<UploadResult> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado.');

    const mediaId = crypto.randomUUID();
    const ext = guessExt(file.type) || '.bin';
    const storagePath = `${user.id}/matches/${matchId}/${mediaId}${ext}`;

    // Guardar también local como caché offline
    const deviceKey = `media:${mediaId}`;
    await idbPut(deviceKey, file);

    const { error } = await supabase.storage
        .from('matches')
        .upload(storagePath, file, { upsert: false, contentType: file.type });
    if (error) throw error;

    return {
        storage_provider: 'supabase',
        storage_path: storagePath,
        device_uri: deviceKey,
        google_drive_file_id: null,
    };
}

// ─── Google Drive ────────────────────────────────────────────────────────────

async function uploadDrive(file: File, accessToken: string): Promise<UploadResult> {
    // 1. Subir el archivo a Drive (multipart metadata + blob)
    const metadata = {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
    };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const uploadRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: form,
        }
    );
    if (!uploadRes.ok) {
        const err = await uploadRes.text();
        throw new Error(`Drive upload failed: ${err}`);
    }
    const { id: fileId } = await uploadRes.json();

    // 2. Hacer el archivo público (anyoneWithLink → reader)
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });

    return {
        storage_provider: 'drive',
        storage_path: null,
        device_uri: null,
        google_drive_file_id: fileId,
    };
}

// ─── Cloudflare R2 ───────────────────────────────────────────────────────────

async function uploadR2(file: File, matchId: string): Promise<UploadResult> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado.');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('matchId', matchId);

    const res = await fetch('/api/r2/upload', {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Error R2' }));
        throw new Error(error || 'No se pudo subir a R2.');
    }

    const { path } = await res.json() as { path: string };

    return {
        storage_provider: 'r2',
        storage_path: path,
        device_uri: null,
        google_drive_file_id: null,
    };
}

// ─── Función principal ───────────────────────────────────────────────────────

export async function uploadToProvider(params: UploadParams): Promise<UploadResult> {
    const { file, provider, matchId, googleAccessToken } = params;

    switch (provider) {
        case 'supabase': return uploadSupabase(file, matchId);
        case 'drive': {
            if (!googleAccessToken) throw new Error('Se requiere autenticación con Google para Drive.');
            return uploadDrive(file, googleAccessToken);
        }
        case 'r2': return uploadR2(file, matchId);
        case 'local':
        default:
            return uploadLocal(file, matchId);
    }
}

/** Construye la URL de visualización a partir de los campos de match_media */
export function getMediaDisplayUrl(row: {
    storage_provider?: string | null;
    storage_path?: string | null;
    google_drive_file_id?: string | null;
}): string | null {
    switch (row.storage_provider) {
        case 'drive':
            return row.google_drive_file_id
                ? `https://drive.google.com/uc?id=${row.google_drive_file_id}&export=view`
                : null;
        case 'r2': {
            const base = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, '');
            return base && row.storage_path ? `${base}/${row.storage_path}` : null;
        }
        case 'supabase':
        case 'local':
        default:
            return null; // el caller genera signed URL o blob URL según corresponda
    }
}
