'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import type { StoragePlan } from '@/components/admin/suscripciones/SubscriptionsTable';
import {
  STORAGE_SUBSCRIPTION_STATUSES,
  STORAGE_SUBSCRIPTION_STATUS_LABELS,
  type StorageSubscriptionStatus,
} from '@/lib/admin/storageSubscriptions';

type EditableSubscription = {
  id: string;
  status: StorageSubscriptionStatus;
  current_period_end: string;
  plan_id: string | null;
  gb_amount: number;
};

export default function EditSubscriptionForm({
  subscription,
  plans,
}: {
  subscription: EditableSubscription;
  plans: StoragePlan[];
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [status, setStatus] = useState<StorageSubscriptionStatus>(subscription.status);
  const [periodEnd, setPeriodEnd] = useState(subscription.current_period_end?.slice(0, 10) ?? '');
  const [planId, setPlanId] = useState(subscription.plan_id ?? '');
  const [gbAmount, setGbAmount] = useState(String(subscription.gb_amount));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planId) ?? null,
    [planId, plans]
  );

  async function handleSave() {
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      id: subscription.id,
      status,
      current_period_end: periodEnd ? new Date(periodEnd).toISOString() : undefined,
      plan_id: planId || null,
      gb_amount: Number(gbAmount),
    };

    try {
      const res = await fetch('/api/admin/suscripciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || json?.message || 'No se pudo actualizar la suscripción.');
      }
      showToast({ title: 'Suscripción actualizada', variant: 'success' });
      router.refresh();
    } catch (e: any) {
      const msg = e?.message || 'Error al guardar cambios.';
      setError(msg);
      showToast({ title: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-lg font-semibold text-slate-100">Editar suscripción</h2>
      <p className="mt-1 text-xs text-slate-400">
        Puedes actualizar estado, plan, almacenamiento y fecha de fin.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-slate-300">Estado</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StorageSubscriptionStatus)}
            className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {STORAGE_SUBSCRIPTION_STATUSES.map((st) => (
              <option key={st} value={st}>
                {STORAGE_SUBSCRIPTION_STATUS_LABELS[st]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-slate-300">Fecha de vencimiento</Label>
          <Input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="border-slate-700 bg-slate-950/70 text-slate-100"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-slate-300">Plan</Label>
          <select
            value={planId}
            onChange={(e) => {
              const nextPlanId = e.target.value;
              setPlanId(nextPlanId);
              const plan = plans.find((p) => p.id === nextPlanId);
              if (plan) setGbAmount(String(plan.gb_amount));
            }}
            className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <option value="">Sin plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — {plan.gb_amount} GB
              </option>
            ))}
          </select>
          {selectedPlan && (
            <p className="text-xs text-slate-500">
              Precio de referencia: {(selectedPlan.amount_cents / 100).toFixed(2)}{' '}
              {selectedPlan.currency.toUpperCase()}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-slate-300">Almacenamiento (GB)</Label>
          <Input
            type="number"
            min={0}
            value={gbAmount}
            onChange={(e) => setGbAmount(e.target.value)}
            className="border-slate-700 bg-slate-950/70 text-slate-100"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-800/50 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/admin/suscripciones')}
          disabled={saving}
        >
          Volver al listado
        </Button>
      </div>
    </section>
  );
}
