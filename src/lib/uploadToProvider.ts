// src/lib/uploadToProvider.ts
// Router de subida: enruta al proveedor correcto según la preferencia del usuario.
// Devuelve los campos a guardar en match_media.
import { idbPut } from '@/lib/mediaLocal';
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

// ─── Remoto facturable (API) ─────────────────────────────────────────────────

async function uploadRemoteViaApi(file: File, matchId: string): Promise<UploadResult> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado.');

    const mediaId = crypto.randomUUID();
    const deviceKey = `media:${mediaId}`;
    await idbPut(deviceKey, file);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('matchId', matchId);
    formData.append('mediaId', mediaId);
    formData.append('device_uri', deviceKey);

    const res = await fetch('/api/remote-media/upload', {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) {
        const { error, code } = await res.json().catch(() => ({ error: 'Error de almacenamiento remoto' }));
        throw new Error(error || code || 'No se pudo subir a la nube.');
    }

    const { storageProvider, path } = await res.json() as { storageProvider: StorageProvider; path: string };
    const provider = storageProvider === 'supabase' ? 'supabase' : 'r2';

    return {
        storage_provider: provider,
        storage_path: provider === 'r2' ? `r2:${path}` : path,
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
    const result = await uploadRemoteViaApi(file, matchId);
    return { ...result, device_uri: result.device_uri };
}

// ─── Función principal ───────────────────────────────────────────────────────

export async function uploadToProvider(params: UploadParams): Promise<UploadResult> {
    const { file, provider, matchId, googleAccessToken } = params;

    switch (provider) {
        case 'supabase': return uploadRemoteViaApi(file, matchId);
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
        case 'drive': {
            const fileId = row.google_drive_file_id
                || (row.storage_path?.startsWith('drive:') ? row.storage_path.slice(6) : null);
            return fileId ? `https://drive.google.com/uc?id=${fileId}&export=view` : null;
        }
        case 'r2': {
            const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '');
            return base && row.storage_path ? `${base}/${row.storage_path}` : null;
        }
        case 'supabase':
        case 'local':
        default:
            return null; // el caller genera signed URL o blob URL según corresponda
    }
}
