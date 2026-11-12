export type SeatReductionInput = {
  currentSeats: number;
  newSeats: number;
  linkedPlayerIds: string[];
  unlinkPlayerIds: string[];
};

export type SeatReductionResult =
  | { ok: true; freeSeatsRemoved: number }
  | { ok: false; code: string; message: string };

/**
 * Valida reducción de asientos en suscripciones legacy (campo `seats`).
 * Los jugadores activos en `subscription_players` deben desvincularse hasta cumplir el nuevo cupo.
 */
export function validateSeatReduction(input: SeatReductionInput): SeatReductionResult {
  const { currentSeats, newSeats, linkedPlayerIds, unlinkPlayerIds } = input;

  if (!Number.isFinite(currentSeats) || currentSeats < 0) {
    return { ok: false, code: 'invalid_current_seats', message: 'Asientos actuales inválidos' };
  }
  if (!Number.isFinite(newSeats) || newSeats < 0) {
    return { ok: false, code: 'invalid_new_seats', message: 'Nuevo número de asientos inválido' };
  }
  if (newSeats > currentSeats) {
    return { ok: true, freeSeatsRemoved: 0 };
  }
  if (newSeats === currentSeats) {
    return { ok: true, freeSeatsRemoved: 0 };
  }

  const reduction = currentSeats - newSeats;
  const used = linkedPlayerIds.length;
  const free = Math.max(0, currentSeats - used);

  const unlinkSet = new Set(unlinkPlayerIds);
  if (unlinkSet.size !== unlinkPlayerIds.length) {
    return { ok: false, code: 'duplicate_unlink', message: 'IDs de jugador duplicados en desvinculación' };
  }

  for (const pid of unlinkPlayerIds) {
    if (!linkedPlayerIds.includes(pid)) {
      return {
        ok: false,
        code: 'unlink_not_linked',
        message: 'Se intentó desvincular un jugador que no ocupa asiento en esta suscripción',
      };
    }
  }

  if (unlinkPlayerIds.length > reduction) {
    return {
      ok: false,
      code: 'too_many_unlinks',
      message: 'No se pueden desvincular más jugadores que asientos a reducir',
    };
  }

  const minUnlink = Math.max(0, used - newSeats);
  if (unlinkPlayerIds.length < minUnlink) {
    return {
      ok: false,
      code: 'players_must_unlink',
      message: `Debes desvincular al menos ${minUnlink} jugador(es) para reducir a ${newSeats} asientos`,
    };
  }

  const freeSeatsRemoved = reduction - unlinkPlayerIds.length;
  if (freeSeatsRemoved > free) {
    return {
      ok: false,
      code: 'insufficient_free_seats',
      message: 'No hay suficientes asientos libres para completar la reducción sin desvincular más jugadores',
    };
  }

  const remainingLinked = used - unlinkPlayerIds.length;
  if (remainingLinked > newSeats) {
    return {
      ok: false,
      code: 'seats_below_linked',
      message: 'Tras desvincular, los jugadores activos siguen superando el nuevo cupo de asientos',
    };
  }

  return { ok: true, freeSeatsRemoved };
}
