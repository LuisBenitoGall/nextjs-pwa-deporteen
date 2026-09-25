'use client';

import { useMemo, useState } from 'react';
import Submit from '@/components/Submit';
import StripeCheckoutButton from '@/components/subscription/StripeCheckoutButton';

export type RenewPlanOption = {
  id: string;
  name: string;
  days: number;
  amount_cents: number;
};

export type RenewPlayerOption = {
  id: string;
  display: string;
};

type MultiProps = {
  plans: RenewPlanOption[];
  players: RenewPlayerOption[];
  maxSeats: number;
  labels: {
    choosePlan: string;
    continue: string;
    sending: string;
    player: string;
    lifetime: string;
    duration: string;
    days: string;
    years: string;
    perYear: string;
  };
};

export function RenewMultiCheckoutForm({ plans, players, maxSeats, labels }: MultiProps) {
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? '');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const togglePlayer = (id: string) => {
    setSelectedPlayers((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxSeats) return prev;
      return [...prev, id];
    });
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedPlanId) {
      setError('Selecciona un plan');
      return;
    }
    if (!selectedPlayers.length) {
      setError('Selecciona al menos un deportista');
      return;
    }
    try {
      const res = await fetch('/api/billing/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlanId, playerIds: selectedPlayers }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'No se pudo iniciar la renovación');
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de red');
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div className="rounded-xl border p-4 bg-white">
        {players.length === 0 ? (
          <p className="text-sm text-gray-500">—</p>
        ) : (
          <ul className="space-y-2">
            {players.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selectedPlayers.includes(p.id)}
                  onChange={() => togglePlayer(p.id)}
                  id={`p-${p.id}`}
                />
                <label htmlFor={`p-${p.id}`} className="text-sm text-gray-800">
                  {p.display}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <div className="mb-3 text-sm text-gray-600">{labels.choosePlan}</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <label
              key={p.id}
              className="rounded-xl border border-green-600 p-5 hover:bg-green-50 transition cursor-pointer"
            >
              <input
                type="radio"
                name="planId"
                value={p.id}
                className="mr-2 align-middle"
                checked={selectedPlanId === p.id}
                onChange={() => setSelectedPlanId(p.id)}
                required
              />
              <span className="text-sm text-gray-700">{p.name}</span>
              <div className="mt-2 text-2xl font-extrabold">
                {(p.amount_cents / 100).toFixed(2)}€
                <span className="text-xs ml-2 font-normal text-gray-600">x {labels.player}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <Submit text={labels.continue} loadingText={labels.sending} />
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}

type SinglePlanCardProps = {
  plan: RenewPlanOption;
  labels: {
    continue: string;
    sending: string;
    player: string;
  };
};

export function RenewSinglePlanCard({ plan, labels }: SinglePlanCardProps) {
  const total = useMemo(() => (plan.amount_cents / 100).toFixed(2), [plan.amount_cents]);
  return (
    <div className="h-full rounded-xl border border-green-600 p-5 hover:bg-green-50 transition flex flex-col">
      <div className="text-sm text-gray-700">{plan.name}</div>
      <div className="mt-2 text-3xl font-extrabold">
        {total}€
        <span className="text-sm ml-2 font-normal text-gray-600">x {labels.player}</span>
      </div>
      <div className="mt-auto pt-4">
        <StripeCheckoutButton
          planId={plan.id}
          units={1}
          label={labels.continue}
          loadingLabel={labels.sending}
        />
      </div>
    </div>
  );
}
