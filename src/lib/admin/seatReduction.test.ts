import { describe, it, expect } from 'vitest';
import { validateSeatReduction } from './seatReduction';

describe('validateSeatReduction', () => {
  it('allows increase without unlinking', () => {
    const r = validateSeatReduction({
      currentSeats: 3,
      newSeats: 5,
      linkedPlayerIds: ['p1', 'p2'],
      unlinkPlayerIds: [],
    });
    expect(r.ok).toBe(true);
  });

  it('rejects when occupied seats exceed new cap without unlink', () => {
    const r = validateSeatReduction({
      currentSeats: 5,
      newSeats: 2,
      linkedPlayerIds: ['p1', 'p2', 'p3'],
      unlinkPlayerIds: [],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('players_must_unlink');
  });

  it('accepts reduction with enough player unlinks and free seats', () => {
    const r = validateSeatReduction({
      currentSeats: 5,
      newSeats: 2,
      linkedPlayerIds: ['p1', 'p2'],
      unlinkPlayerIds: ['p1'],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.freeSeatsRemoved).toBe(2);
  });

  it('rejects unlink of player not on subscription', () => {
    const r = validateSeatReduction({
      currentSeats: 4,
      newSeats: 2,
      linkedPlayerIds: ['p1'],
      unlinkPlayerIds: ['p9'],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('unlink_not_linked');
  });
});
