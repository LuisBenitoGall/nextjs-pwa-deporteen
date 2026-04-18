import { describe, expect, it } from 'vitest';
import { runWithKeyLock } from '@/lib/cloud/upload-lock';

describe('runWithKeyLock', () => {
  it('serializes concurrent uploads so quota cannot be over-committed', async () => {
    let bytesUsed = 0;
    const bytesQuota = 100;
    const fileSize = 80;

    const uploadAttempt = async () =>
      runWithKeyLock('user-1', async () => {
        const canUpload = bytesUsed + fileSize <= bytesQuota;
        if (!canUpload) return false;
        // Simulate network/storage delay while lock is held.
        await new Promise((resolve) => setTimeout(resolve, 10));
        bytesUsed += fileSize;
        return true;
      });

    const [first, second] = await Promise.all([uploadAttempt(), uploadAttempt()]);

    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(bytesUsed).toBe(80);
  });
});
