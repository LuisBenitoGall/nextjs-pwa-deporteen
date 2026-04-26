import type { StorageProvider } from '@/lib/googleDrive/server';

export const ALLOWED_PROVIDERS: StorageProvider[] = ['local', 'drive', 'r2', 'supabase'];

export function isAllowedProvider(provider: string | null | undefined): provider is StorageProvider {
  return !!provider && ALLOWED_PROVIDERS.includes(provider as StorageProvider);
}

export function isCrossUserAttempt(currentUserId: string, payloadUserId?: string | null): boolean {
  return !!payloadUserId && payloadUserId !== currentUserId;
}
