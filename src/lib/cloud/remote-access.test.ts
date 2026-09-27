import { describe, expect, it, vi } from 'vitest';
import { assertRemoteStorageUploadAllowed } from '@/lib/cloud/remote-access';

function makeSupabaseMock(usage: {
  planGb: number;
  bytesUsed: number;
}) {
  const storageSubChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: usage.planGb > 0
        ? { gb_amount: usage.planGb, status: 'active', current_period_end: new Date(Date.now() + 86400000).toISOString() }
        : null,
    }),
  };

  const mediaRows = usage.bytesUsed > 0
    ? [{ size_bytes: usage.bytesUsed, storage_provider: 'r2', storage_path: 'r2:x' }]
    : [];

  const mediaChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockResolvedValue({ data: mediaRows, error: null }),
  };

  return {
    from: (table: string) => {
      if (table === 'storage_subscriptions') return storageSubChain;
      if (table === 'match_media') return mediaChain;
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as import('@supabase/supabase-js').SupabaseClient;
}

describe('assertRemoteStorageUploadAllowed', () => {
  it('deniega sin userId', async () => {
    const result = await assertRemoteStorageUploadAllowed(makeSupabaseMock({ planGb: 10, bytesUsed: 0 }), null, 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('UNAUTHORIZED');
  });

  it('deniega sin suscripción activa', async () => {
    const result = await assertRemoteStorageUploadAllowed(makeSupabaseMock({ planGb: 0, bytesUsed: 0 }), 'user-1', 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('NO_ACTIVE_STORAGE_SUBSCRIPTION');
  });

  it('deniega cuando se supera la cuota', async () => {
    const gb = 1;
    const used = gb * 1024 ** 3 - 10;
    const result = await assertRemoteStorageUploadAllowed(
      makeSupabaseMock({ planGb: gb, bytesUsed: used }),
      'user-1',
      100
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('QUOTA_EXCEEDED');
  });

  it('permite subida con suscripción y hueco en cuota', async () => {
    const result = await assertRemoteStorageUploadAllowed(
      makeSupabaseMock({ planGb: 10, bytesUsed: 1000 }),
      'user-1',
      500
    );
    expect(result.ok).toBe(true);
  });
});
