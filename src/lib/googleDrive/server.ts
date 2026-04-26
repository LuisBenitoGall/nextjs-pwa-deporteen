import 'server-only';

import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type DriveConnectionStatus = 'connected' | 'reconnect-required' | 'disconnected';
export type StorageProvider = 'local' | 'drive' | 'r2' | 'supabase';

const STATE_COOKIE = 'google_drive_oauth_state';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

export function getGoogleOAuthConfig() {
  return {
    clientId: requiredEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requiredEnv('GOOGLE_CLIENT_SECRET'),
    redirectUri: requiredEnv('GOOGLE_DRIVE_REDIRECT_URI'),
  };
}

function getTokenSecret(): Buffer {
  const raw = requiredEnv('GOOGLE_DRIVE_TOKEN_SECRET');
  return crypto.createHash('sha256').update(raw).digest();
}

export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getTokenSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptToken(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Invalid token payload');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getTokenSecret(),
    Buffer.from(ivB64, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  const out = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]);
  return out.toString('utf8');
}

export function createOAuthState() {
  return crypto.randomBytes(24).toString('hex');
}

export async function saveOAuthStateCookie(state: string) {
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });
}

export async function readOAuthStateCookie() {
  const jar = await cookies();
  return jar.get(STATE_COOKIE)?.value ?? null;
}

export async function clearOAuthStateCookie() {
  const jar = await cookies();
  jar.set(STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export function buildGoogleConnectUrl(state: string) {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    scope: 'https://www.googleapis.com/auth/drive.file',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }
  return (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
  };
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Refresh failed: ${text}`);
  }
  return (await res.json()) as { access_token: string; scope?: string; token_type?: string };
}

export async function getDriveConnection(userId: string) {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('google_drive_connections')
    .select('user_id, refresh_token_encrypted, status, last_error')
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? null;
}

export async function getDriveStatus(userId: string): Promise<DriveConnectionStatus> {
  const conn = await getDriveConnection(userId);
  if (!conn) return 'disconnected';
  if (conn.status === 'reconnect-required') return 'reconnect-required';
  return 'connected';
}
