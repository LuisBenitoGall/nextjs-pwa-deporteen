// src/lib/r2/client.ts
// Cliente S3 apuntando a Cloudflare R2
// Las credenciales NUNCA llegan al frontend: este módulo solo se importa en server-side.
import { S3Client } from '@aws-sdk/client-s3';

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in your .env'
    );
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

// Singleton reutilizable durante la vida del proceso Node (HMR-safe en dev)
let _client: S3Client | null = null;

export function getR2(): S3Client {
  if (!_client) _client = getR2Client();
  return _client;
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? 'deporteen-media';

/** URL pública base del bucket (CDN custom domain o URL pública de R2) */
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? '';
