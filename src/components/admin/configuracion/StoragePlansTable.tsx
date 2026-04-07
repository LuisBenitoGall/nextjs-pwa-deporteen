'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import type { ColumnDefinition } from 'tabulator-tables';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import AdminTabulatorTable from '@/components/admin/shared/AdminTabulatorTable';
import {
  makeEditBtn,
  makeDeleteBtn,
  makeToggleBtn,
  makeActionsContainer,
  dispatchAction,
} from '@/components/admin/shared/tabulatorUtils';

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
            Precio = {amountCents ? (Number(amountCents) / 100).toFixed(2) : '0.00'}{' '}
            {currency.toUpperCase()}
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [editPlan, setEditPlan] = useState<StoragePlan | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmPlan, setConfirmPlan] = useState<StoragePlan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Bridge: listen for Tabulator action events
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const { action, row } = (e as CustomEvent<{ action: string; row: StoragePlan }>).detail;
      if (action === 'edit') setEditPlan(row);
      if (action === 'delete') setConfirmPlan(row);
      if (action === 'toggle') handleToggleActive(row);
    };
    el.addEventListener('tabulator-action', handler);
    return () => el.removeEventListener('tabulator-action', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggleActive(plan: StoragePlan) {
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

  const columns: ColumnDefinition[] = [
    {
      title: 'Nombre',
      field: 'name',
      minWidth: 140,
      headerFilter: 'input' as const,
      formatter: (cell) => {
        const p = cell.getData() as StoragePlan;
        const div = document.createElement('div');
        div.innerHTML =
          `<div class="font-medium text-slate-100">${p.name}</div>` +
          (p.name_key ? `<div class="text-xs text-slate-500">${p.name_key}</div>` : '');
        return div;
      },
    },
    {
      title: 'Almacenamiento',
      field: 'gb_amount',
      minWidth: 110,
      hozAlign: 'center',
      formatter: (cell) => `${cell.getValue() as number} GB`,
    },
    {
      title: 'Precio',
      field: 'amount_cents',
      minWidth: 100,
      hozAlign: 'right',
      formatter: (cell) => {
        const p = cell.getData() as StoragePlan;
        return `${(p.amount_cents / 100).toFixed(2)} ${p.currency.toUpperCase()}`;
      },
    },
    {
      title: 'Stripe',
      field: 'stripe_price_id',
      minWidth: 120,
      formatter: (cell) => {
        const v = cell.getValue() as string | null;
        const span = document.createElement('span');
        span.className = 'text-xs text-slate-500 font-mono';
        span.textContent = v ?? '—';
        return span;
      },
    },
    {
      title: 'Estado',
      field: 'active',
      minWidth: 90,
      hozAlign: 'center',
      formatter: (cell) => {
        const active = cell.getValue() as boolean;
        const span = document.createElement('span');
        span.className = active
          ? 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
          : 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-700 text-slate-400';
        span.textContent = active ? 'Activo' : 'Inactivo';
        return span;
      },
    },
    {
      title: 'Acciones',
      field: '_actions',
      headerSort: false,
      minWidth: 200,
      hozAlign: 'right',
      formatter: (cell) => {
        const p = cell.getData() as StoragePlan;
        const editBtn = makeEditBtn();
        const toggleBtn = makeToggleBtn(p.active ? 'Desactivar' : 'Activar');
        const delBtn = makeDeleteBtn();
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dispatchAction(cell.getElement(), 'edit', p);
        });
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dispatchAction(cell.getElement(), 'toggle', p);
        });
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dispatchAction(cell.getElement(), 'delete', p);
        });
        return makeActionsContainer(editBtn, toggleBtn, delBtn);
      },
    },
  ];

  return (
    <div ref={wrapperRef} className="space-y-4">
      <AdminTabulatorTable<StoragePlan>
        data={plans}
        columns={columns}
        exportFileName="planes-almacenamiento"
        toolbarRight={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            + Nuevo plan
          </Button>
        }
      />

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
