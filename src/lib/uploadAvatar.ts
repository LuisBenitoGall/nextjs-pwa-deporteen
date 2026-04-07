// src/lib/uploadAvatar.ts
// Compresión + subida a Supabase Storage. Solo para client components.
import { supabase } from '@/lib/supabase/client';
import { guessExt } from '@/lib/uploadMatchMedia';

const BUCKET = 'match-media';
const MAX_BYTES = 100 * 1024; // 100 KB
const SIGNED_URL_EXPIRY = 315_360_000; // ~10 años en segundos

/** Valida que el archivo sea una imagen. Lanza Error si no. */
export function validateImageFile(file: File): void {
    if (!file.type.startsWith('image/')) {
        throw new Error('avatar_formato_invalido');
    }
}

/**
 * Comprime el archivo con Canvas hasta que su tamaño sea ≤ maxBytes.
 * Usa JPEG como formato de salida para máxima compresión.
 * Si ya cumple el límite, devuelve el archivo original sin modificar.
 */
export function compressImage(file: File, maxBytes = MAX_BYTES): Promise<File> {
    if (file.size <= maxBytes) return Promise.resolve(file);

    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new window.Image();

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            // Reducir dimensiones proporcionalmente al ratio de compresión estimado
            const ratio = Math.sqrt(maxBytes / file.size) * 0.9;
            const canvas = document.createElement('canvas');
            canvas.width  = Math.max(1, Math.floor(img.naturalWidth  * ratio));
            canvas.height = Math.max(1, Math.floor(img.naturalHeight * ratio));

            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Canvas no disponible.')); return; }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            let quality = 0.85;
            const attempt = () => {
                canvas.toBlob((blob) => {
                    if (!blob) { reject(new Error('No se pudo generar el blob.')); return; }
                    if (blob.size <= maxBytes || quality < 0.1) {
                        const outName = file.name.replace(/\.[^.]+$/, '.jpg');
                        resolve(new File([blob], outName, { type: 'image/jpeg' }));
                    } else {
                        quality = Math.round((quality - 0.1) * 10) / 10;
                        attempt();
                    }
                }, 'image/jpeg', quality);
            };
            attempt();
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('No se pudo cargar la imagen.'));
        };

        img.src = objectUrl;
    });
}

/**
 * Valida, comprime (si es necesario) y sube el avatar a Supabase Storage.
 * Devuelve la URL firmada (~10 años) lista para guardar en player_seasons.avatar.
 */
export async function uploadAvatar(
    file: File,
    playerId: string,
    seasonId: string,
): Promise<string> {
    validateImageFile(file);

    const compressed = await compressImage(file);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado.');

    const ext = guessExt(compressed.type) || '.jpg';
    const storagePath = `${user.id}/avatars/${playerId}/${seasonId}${ext}`;

    const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, compressed, {
            upsert: true,
            contentType: compressed.type,
        });
    if (upErr) throw upErr;

    const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);
    if (signErr) throw signErr;

    return signed.signedUrl;
}
