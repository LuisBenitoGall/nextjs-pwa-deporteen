// src/lib/r2/client.ts
// Cliente Cloudflare R2 — solo servidor (nunca importar en client components)
import 'server-only';
import { S3Client } from '@aws-sdk/client-s3';

declare global {
    // eslint-disable-next-line no-var
    var __r2_client__: S3Client | undefined;
}

export function getR2Client(): S3Client {
    if (typeof window !== 'undefined') {
        throw new Error('[R2] No se puede usar en el cliente.');
    }

    if (!globalThis.__r2_client__) {
        const accountId = process.env.R2_ACCOUNT_ID;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

        if (!accountId)       throw new Error('[R2] Falta R2_ACCOUNT_ID');
        if (!accessKeyId)     throw new Error('[R2] Falta R2_ACCESS_KEY_ID');
        if (!secretAccessKey) throw new Error('[R2] Falta R2_SECRET_ACCESS_KEY');

        globalThis.__r2_client__ = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId, secretAccessKey },
        });
    }

    return globalThis.__r2_client__!;
}

export function getR2Bucket(): string {
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) throw new Error('[R2] Falta R2_BUCKET_NAME');
    return bucket;
}

/** URL pública base del bucket (ej. https://pub-xxx.r2.dev) */
export function getR2PublicUrl(): string {
    const url = process.env.R2_PUBLIC_URL;
    if (!url) throw new Error('[R2] Falta R2_PUBLIC_URL');
    return url.replace(/\/$/, '');
}
