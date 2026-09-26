import { describe, expect, it } from 'vitest';
import { sumBillableRemoteBytes } from '@/lib/cloud/usage-helpers';

describe('cuota remota por usuario', () => {
  it('suma todos los jugadores y excluye borrados, local y drive', () => {
    const rows = [
      { size_bytes: 100, storage_provider: 'r2', storage_path: 'r2:u/m/1.jpg' },
      { size_bytes: 200, storage_provider: 'supabase', storage_path: 'u/m/2.jpg' },
      { size_bytes: 50, storage_provider: 'drive', storage_path: 'drive:abc' },
      { size_bytes: 30, storage_provider: 'local', storage_path: null },
      { size_bytes: 999, storage_provider: 'r2', storage_path: 'r2:u/m/x.jpg' }, // otro jugador, mismo user
      { size_bytes: 10, storage_provider: null, storage_path: 'u/m/legacy.jpg' },
    ];

    expect(sumBillableRemoteBytes(rows)).toBe(100 + 200 + 999 + 10);
  });
});
