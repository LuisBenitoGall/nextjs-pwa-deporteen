'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { AdminSubscription, StoragePlan } from './SubscriptionsTable';

interface Props {
  subscription: AdminSubscription;
  plans: StoragePlan[];
  onClose: () => void;
  onSaved: () => void;
}

export default function EditSubscriptionDialog({ subscription: sub, plans, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(sub.status);
  const [gbAmount, setGbAmount] = useState(String(sub.gb_amount));
  const [planId, setPlanId] = useState(sub.plan_id ?? '');
  const [periodEnd, setPeriodEnd] = useState(
    sub.current_period_end ? sub.current_period_end.slice(0, 10) : ''
  );

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/suscripciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sub.id,
          status,
          gb_amount: Number(gbAmount),
          plan_id: planId || null,
          current_period_end: periodEnd ? new Date(periodEnd).toISOString() : undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ title: 'Suscripción actualizada', variant: 'success' });
      onSaved();
    } catch {
      showToast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/suscripciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sub.id, status: 'cancelled' }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ title: 'Suscripción cancelada', variant: 'success' });
      onSaved();
    } catch {
      showToast({ title: 'Error al cancelar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-slate-900 text-slate-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modificar suscripción</DialogTitle>
          <p className="text-xs text-slate-400 mt-1">
            Usuario:{' '}
            <span className="text-slate-200">
              {[sub.profile?.name, sub.profile?.surname].filter(Boolean).join(' ') ||
                sub.profile?.email ||
                sub.user_id}
            </span>
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-slate-300">Estado</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AdminSubscription['status'])}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <option value="active">Activo</option>
              <option value="expired">Expirado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">Plan</Label>
            <select
              value={planId}
              onChange={(e) => {
                setPlanId(e.target.value);
                const plan = plans.find((p) => p.id === e.target.value);
                if (plan) setGbAmount(String(plan.gb_amount));
              }}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <option value="">Sin plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.gb_amount} GB
                </option>
              ))}
            </select>
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

          <div className="space-y-1.5">
            <Label className="text-slate-300">Fecha de vencimiento</Label>
            <Input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="border-slate-700 bg-slate-950/70 text-slate-100"
            />
          </div>

          <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3">
            <p className="mb-2 text-xs text-red-400">Acciones rápidas</p>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleCancel}
              disabled={saving || sub.status === 'cancelled'}
            >
              Cancelar suscripción
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="text-slate-300"
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
