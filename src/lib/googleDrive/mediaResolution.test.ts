import { describe, expect, it, vi } from 'vitest';
import { resolveDriveMediaSource } from '@/lib/googleDrive/mediaResolution';

describe('resolveDriveMediaSource', () => {
  it('keeps moved files visible when Drive responds OK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const result = await resolveDriveMediaSource('abc123');
    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.src).toContain('/api/google/drive/file/abc123');
    }
  });

  it('marks deleted/inaccessible files as unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const result = await resolveDriveMediaSource('gone-id');
    expect(result.available).toBe(false);
  });
});
