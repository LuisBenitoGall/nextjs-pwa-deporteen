import 'server-only';

type RequiredEnv = {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_DRIVE_REDIRECT_URI: string;
  GOOGLE_DRIVE_TOKEN_SECRET: string;
};

let cached: RequiredEnv | null = null;

function readRequired(name: keyof RequiredEnv) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var ${name}`);
  }
  return value;
}

export function getServerEnv(): RequiredEnv {
  if (cached) return cached;

  const env: RequiredEnv = {
    GOOGLE_CLIENT_ID: readRequired('GOOGLE_CLIENT_ID'),
    GOOGLE_CLIENT_SECRET: readRequired('GOOGLE_CLIENT_SECRET'),
    GOOGLE_DRIVE_REDIRECT_URI: readRequired('GOOGLE_DRIVE_REDIRECT_URI'),
    GOOGLE_DRIVE_TOKEN_SECRET: readRequired('GOOGLE_DRIVE_TOKEN_SECRET'),
  };

  try {
    const redirectUrl = new URL(env.GOOGLE_DRIVE_REDIRECT_URI);
    if (!['http:', 'https:'].includes(redirectUrl.protocol)) {
      throw new Error('GOOGLE_DRIVE_REDIRECT_URI must use http or https');
    }
  } catch (error) {
    throw new Error(`Invalid GOOGLE_DRIVE_REDIRECT_URI: ${(error as Error).message}`);
  }

  cached = env;
  return env;
}
