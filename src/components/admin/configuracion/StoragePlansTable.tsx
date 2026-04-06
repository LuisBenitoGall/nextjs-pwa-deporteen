'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export interface StoragePlan {
  id: string;
  name: string;
  name_key: string | null;
  gb_amount: number;
  amount_cents: number;
  currency: string;
  stripe_price_id: string | null;
  active: boolean;
  created_at: string;
}

function PlanDialog({
  plan,
  onClose,
  onSaved,
}: {
  plan: StoragePlan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(plan?.name ?? '');
  const [gbAmount, setGbAmount] = useState(String(plan?.gb_amount ?? ''));
  const [amountCents, setAmountCents] = useState(String(plan?.amount_cents ?? ''));
  const [currency, setCurrency] = useState(plan?.currency ?? 'eur');
  const [stripePrice, setStripePrice] = useState(plan?.stripe_price_id ?? '');

  async function handleSave() {
    setSaving(true);
    try {
      const isNew = !plan;
      const res = await fetch('/api/admin/configuracion/planes', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: plan?.id,
          name,
          gb_amount: Number(gbAmount),
          amount_cents: Number(amountCents),
          currency,
          stripe_price_id: stripePrice || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ title: isNew ? 'Plan creado' : 'Plan actualizado', variant: 'success' });
      onSaved();
    } catch {
      showToast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-slate-900 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{plan ? 'Editar plan' : 'Nuevo plan'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-slate-300">Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-slate-700 bg-slate-950/70 text-slate-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
              <Label className="text-slate-300">Precio (céntimos)</Label>
              <Input
                type="number"
                min={0}
                value={amountCents}
                onChange={(e) => setAmountCents(e.target.value)}
                className="border-slate-700 bg-slate-950/70 text-slate-100"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300">Moneda</Label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100"
            >
              <option value="eur">EUR</option>
              <option value="usd">USD</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300">Stripe Price ID (opcional)</Label>
            <Input
              value={stripePrice}
              onChange={(e) => setStripePrice(e.target.value)}
              placeholder="price_..."
              className="border-slate-700 bg-slate-950/70 text-slate-100"
            />
          </div>
          <p className="text-xs text-slate-500">
            Precio = {amountCents ? (Number(amountCents) / 100).toFixed(2) : '0.00'} {currency.toUpperCase()}
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving} className="text-slate-300">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !name || !gbAmount || !amountCents}>
            {saving ? 'Guardando…' : plan ? 'Guardar' : 'Crear plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StoragePlansTable({ plans }: { plans: StoragePlan[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editPlan, setEditPlan] = useState<StoragePlan | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmPlan, setConfirmPlan] = useState<StoragePlan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleToggleActive(plan: StoragePlan) {
    setTogglingId(plan.id);
    try {
      const res = await fetch('/api/admin/configuracion/planes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, active: !plan.active }),
      });
      if (!res.ok) throw new Error();
      showToast({ title: plan.active ? 'Plan desactivado' : 'Plan activado', variant: 'success' });
      router.refresh();
    } catch {
      showToast({ title: 'Error', variant: 'destructive' });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/configuracion/planes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      showToast({ title: 'Plan eliminado', variant: 'success' });
      router.refresh();
    } catch {
      showToast({ title: 'Error al eliminar', variant: 'destructive' });
    } finally {
      setDeletingId(null);
      setConfirmPlan(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>+ Nuevo plan</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-800/70 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Almacenamiento</th>
              <th className="px-4 py-3 text-left">Precio</th>
              <th className="px-4 py-3 text-left">Stripe</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {plans.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No hay planes configurados
                </td>
              </tr>
            ) : (
              plans.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{p.name}</div>
                    {p.name_key && <div className="text-xs text-slate-500">{p.name_key}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{p.gb_amount} GB</td>
                  <td className="px-4 py-3 text-slate-300">
                    {(p.amount_cents / 100).toFixed(2)} {p.currency.toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                    {p.stripe_price_id || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.active ? 'default' : 'secondary'}>
                      {p.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-slate-600 text-xs text-slate-300 hover:text-white"
                        onClick={() => setEditPlan(p)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-slate-400 hover:text-slate-100"
                        onClick={() => handleToggleActive(p)}
                        disabled={togglingId !== null}
                      >
                        {p.active ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs"
                        onClick={() => setConfirmPlan(p)}
                        disabled={deletingId !== null}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(showCreate || editPlan) && (
        <PlanDialog
          plan={editPlan}
          onClose={() => {
            setEditPlan(null);
            setShowCreate(false);
          }}
          onSaved={() => {
            setEditPlan(null);
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmPlan}
        onOpenChange={(open) => !open && setConfirmPlan(null)}
        title="Eliminar plan"
        description={`¿Eliminar el plan "${confirmPlan?.name}"? Las suscripciones existentes no se verán afectadas.`}
        loading={deletingId !== null}
        onConfirm={() => confirmPlan && handleDelete(confirmPlan.id)}
      />
    </div>
  );
}
