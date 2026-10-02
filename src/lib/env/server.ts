import 'server-only';
import crypto from 'crypto';

type GoogleDriveOAuthEnv = {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_DRIVE_REDIRECT_URI: string;
};

let cachedOAuthEnv: GoogleDriveOAuthEnv | null | undefined;
let cachedTokenSecret: Buffer | null = null;

export class GoogleDriveEnvError extends Error {
  readonly code = 'DRIVE_NOT_CONFIGURED' as const;

  constructor(message: string) {
    super(message);
    this.name = 'GoogleDriveEnvError';
  }
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** Valida redirect URI sin exigir el resto de variables OAuth. */
export function isValidGoogleDriveRedirectUri(raw: string | undefined): raw is string {
  if (!raw) return false;
  try {
    const redirectUrl = new URL(raw);
    return ['http:', 'https:'].includes(redirectUrl.protocol);
  } catch {
    return false;
  }
}

/** Servidor listo para OAuth connect/callback (todas las vars + redirect válido). */
export function isGoogleDriveOAuthConfigured(): boolean {
  return (
    Boolean(readEnv('GOOGLE_CLIENT_ID')) &&
    Boolean(readEnv('GOOGLE_CLIENT_SECRET')) &&
    isValidGoogleDriveRedirectUri(readEnv('GOOGLE_DRIVE_REDIRECT_URI')) &&
    Boolean(readEnv('GOOGLE_DRIVE_TOKEN_SECRET'))
  );
}

function loadGoogleDriveOAuthEnv(): GoogleDriveOAuthEnv {
  const clientId = readEnv('GOOGLE_CLIENT_ID');
  const clientSecret = readEnv('GOOGLE_CLIENT_SECRET');
  const redirectUri = readEnv('GOOGLE_DRIVE_REDIRECT_URI');

  if (!clientId || !clientSecret) {
    throw new GoogleDriveEnvError(
      'Google Drive no está configurado en el servidor (faltan credenciales OAuth).'
    );
  }
  if (!isValidGoogleDriveRedirectUri(redirectUri)) {
    throw new GoogleDriveEnvError(
      'Google Drive no está configurado: GOOGLE_DRIVE_REDIRECT_URI debe ser una URL http(s) válida.'
    );
  }

  return {
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: clientSecret,
    GOOGLE_DRIVE_REDIRECT_URI: redirectUri,
  };
}

/** Credenciales OAuth completas (connect, callback, intercambio de código). */
export function getGoogleDriveOAuthEnv(): GoogleDriveOAuthEnv {
  if (cachedOAuthEnv !== undefined) return cachedOAuthEnv as GoogleDriveOAuthEnv;
  cachedOAuthEnv = loadGoogleDriveOAuthEnv();
  return cachedOAuthEnv;
}

/** Solo client id/secret — p. ej. refresh token, sin validar redirect URI. */
export function getGoogleDriveClientCredentials(): {
  clientId: string;
  clientSecret: string;
} {
  const clientId = readEnv('GOOGLE_CLIENT_ID');
  const clientSecret = readEnv('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new GoogleDriveEnvError(
      'Google Drive no está configurado en el servidor (faltan credenciales OAuth).'
    );
  }
  return { clientId, clientSecret };
}

export function getGoogleDriveTokenSecretBuffer(): Buffer {
  if (cachedTokenSecret) return cachedTokenSecret;
  const raw = readEnv('GOOGLE_DRIVE_TOKEN_SECRET');
  if (!raw) {
    throw new GoogleDriveEnvError(
      'Google Drive no está configurado en el servidor (falta GOOGLE_DRIVE_TOKEN_SECRET).'
    );
  }
  cachedTokenSecret = crypto.createHash('sha256').update(raw).digest();
  return cachedTokenSecret;
}

/** @deprecated Usar getGoogleDriveOAuthEnv / getGoogleDriveClientCredentials. */
export function getServerEnv(): GoogleDriveOAuthEnv & { GOOGLE_DRIVE_TOKEN_SECRET: string } {
  const oauth = getGoogleDriveOAuthEnv();
  const secret = readEnv('GOOGLE_DRIVE_TOKEN_SECRET');
  if (!secret) {
    throw new GoogleDriveEnvError('Missing env var GOOGLE_DRIVE_TOKEN_SECRET');
  }
  return { ...oauth, GOOGLE_DRIVE_TOKEN_SECRET: secret };
}

export function isGoogleDriveEnvError(error: unknown): error is GoogleDriveEnvError {
  return error instanceof GoogleDriveEnvError;
}

export function mapGoogleDriveEnvErrorToResponse(error: unknown): {
  status: number;
  body: { error: string; code: string };
} {
  if (isGoogleDriveEnvError(error)) {
    return {
      status: 503,
      body: {
        error:
          'Google Drive no está disponible en este momento. Guarda en el dispositivo o contacta con soporte.',
        code: error.code,
      },
    };
  }
  const message = String((error as Error)?.message ?? error);
  if (/Invalid GOOGLE_DRIVE_REDIRECT_URI|GOOGLE_DRIVE_REDIRECT_URI|Missing env var GOOGLE/i.test(message)) {
    return {
      status: 503,
      body: {
        error:
          'Google Drive no está disponible en este momento. Guarda en el dispositivo o contacta con soporte.',
        code: 'DRIVE_NOT_CONFIGURED',
      },
    };
  }
  return {
    status: 500,
    body: { error: message || 'Error interno', code: 'INTERNAL' },
  };
}
