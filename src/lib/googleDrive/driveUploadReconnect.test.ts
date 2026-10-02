import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GoogleOAuthError } from '@/lib/googleDrive/server';
import { handleDriveOAuthReconnectFailure } from '@/lib/googleDrive/driveUploadReconnect';

const markMock = vi.fn();
const resetMock = vi.fn();

vi.mock('@/lib/googleDrive/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/googleDrive/server')>();
  return {
    ...actual,
    markDriveConnectionReconnectRequired: (...args: unknown[]) => markMock(...args),
    resetMediaStoragePreferenceToLocal: (...args: unknown[]) => resetMock(...args),
  };
});

describe('handleDriveOAuthReconnectFailure', () => {
  beforeEach(() => {
    markMock.mockReset();
    resetMock.mockReset();
  });

  it('returns reconnect payload and updates backend on invalid_grant', async () => {
    const err = new GoogleOAuthError('Google Drive requiere reconexión', 'invalid_grant');
    const payload = await handleDriveOAuthReconnectFailure('user-1', err);

    expect(payload).toEqual({
      error: 'Drive requiere reconexión',
      code: 'reconnect-required',
      fallbackLocal: true,
    });
    expect(markMock).toHaveBeenCalledWith('user-1', 'refresh:invalid_grant');
    expect(resetMock).toHaveBeenCalledWith('user-1');
  });

  it('returns null for non-reconnect oauth errors', async () => {
    const err = new GoogleOAuthError('temporary', 'temporarily_unavailable');
    const payload = await handleDriveOAuthReconnectFailure('user-1', err);
    expect(payload).toBeNull();
    expect(markMock).not.toHaveBeenCalled();
  });
});
