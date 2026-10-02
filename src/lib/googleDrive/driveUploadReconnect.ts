import {
  isGoogleOAuthReconnectError,
  markDriveConnectionReconnectRequired,
  resetMediaStoragePreferenceToLocal,
} from '@/lib/googleDrive/server';

export type DriveUploadReconnectPayload = {
  error: string;
  code: 'reconnect-required';
  fallbackLocal: true;
};

export async function handleDriveOAuthReconnectFailure(
  userId: string,
  error: unknown,
  lastErrorPrefix = 'refresh:invalid_grant'
): Promise<DriveUploadReconnectPayload | null> {
  if (!isGoogleOAuthReconnectError(error)) return null;

  await markDriveConnectionReconnectRequired(userId, lastErrorPrefix);
  await resetMediaStoragePreferenceToLocal(userId);

  return {
    error: 'Drive requiere reconexión',
    code: 'reconnect-required',
    fallbackLocal: true,
  };
}
