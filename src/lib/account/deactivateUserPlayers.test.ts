import { describe, it, expect, vi } from 'vitest';
import { deactivateUserPlayers } from './deactivateUserPlayers';

describe('deactivateUserPlayers', () => {
  it('updates status false by user_id without deleted_at or active', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    const admin = { from } as any;

    const { error } = await deactivateUserPlayers(admin, 'user-1', '2026-09-26T12:00:00.000Z');

    expect(error).toBeNull();
    expect(from).toHaveBeenCalledWith('players');
    expect(update).toHaveBeenCalledWith({
      status: false,
      updated_at: '2026-09-26T12:00:00.000Z',
    });
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('surfaces database errors', async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: { message: 'column does not exist' } }),
    });
    const admin = { from: vi.fn().mockReturnValue({ update }) } as any;

    const { error } = await deactivateUserPlayers(admin, 'user-1');

    expect(error?.message).toBe('column does not exist');
  });
});
