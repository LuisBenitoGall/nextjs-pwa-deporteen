'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import type { ColumnDefinition } from 'tabulator-tables';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import AdminTabulatorTable from '@/components/admin/shared/AdminTabulatorTable';
import {
  STORAGE_SUBSCRIPTION_STATUS_CLASSES,
  STORAGE_SUBSCRIPTION_STATUS_LABELS,
  isStorageSubscriptionStatus,
} from '@/lib/admin/storageSubscriptions';
import {
  makeEditBtn,
  makeDeleteBtn,
  makeActionsContainer,
  dispatchAction,
} from '@/components/admin/shared/tabulatorUtils';

export interface AdminSubscription {
  id: string;
  user_id: string;
  plan_id: string | null;
  gb_amount: number;
  amount_cents: number;
  currency: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  plan: { id: string; name: string; gb_amount: number; amount_cents: number; currency: string } | null;
  profile: { id: string; username: string | null; full_name: string | null } | null;
}

export interface StoragePlan {
  id: string;
  name: string;
  gb_amount: number;
  amount_cents: number;
  currency: string;
}

export default function SubscriptionsTable({
  subscriptions,
}: {
  subscriptions: AdminSubscription[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmSub, setConfirmSub] = useState<AdminSubscription | null>(null);

  // Bridge: listen for Tabulator action events
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const { action, row } = (e as CustomEvent<{ action: string; row: AdminSubscription }>).detail;
      if (action === 'edit') router.push(`/admin/suscripciones/${row.id}`);
      if (action === 'delete') setConfirmSub(row);
    };
    el.addEventListener('tabulator-action', handler);
    return () => el.removeEventListener('tabulator-action', handler);
  }, [router]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/suscripciones', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ title: 'Suscripción eliminada', variant: 'success' });
      router.refresh();
    } catch {
      showToast({ title: 'Error al eliminar', variant: 'destructive' });
    } finally {
      setDeletingId(null);
      setConfirmSub(null);
    }
  }

  async function handleBulkDelete(rows: AdminSubscription[]) {
    for (const row of rows) {
      await fetch('/api/admin/suscripciones', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
    }
    showToast({ title: `${rows.length} suscripciones eliminadas`, variant: 'success' });
    router.refresh();
  }

  const columns: ColumnDefinition[] = [
    {
      title: 'Usuario',
      field: 'profile',
      minWidth: 160,
      headerFilter: 'input' as const,
      headerFilterFunc: (filterVal: unknown, rowVal: unknown) => {
        const p = rowVal as AdminSubscription['profile'];
        const text = `${p?.full_name ?? ''} ${p?.username ?? ''}`.toLowerCase();
        return text.includes((filterVal as string).toLowerCase());
      },
      sorter: (a: unknown, b: unknown) =>
        ((a as AdminSubscription['profile'])?.full_name ?? '').localeCompare(
          (b as AdminSubscription['profile'])?.full_name ?? ''
        ),
      formatter: (cell) => {
        const p = cell.getValue() as AdminSubscription['profile'];
        const div = document.createElement('div');
        div.innerHTML =
          `<div class="font-medium text-slate-100">${p?.full_name ?? '—'}</div>` +
          `<div class="text-xs text-slate-400">@${p?.username ?? 'sin usuario'}</div>`;
        return div;
      },
    },
    {
      title: 'Plan',
      field: 'plan',
      minWidth: 120,
      sorter: (a: unknown, b: unknown) =>
        ((a as AdminSubscription['plan'])?.name ?? '').localeCompare(
          (b as AdminSubscription['plan'])?.name ?? ''
        ),
      formatter: (cell) => {
        const p = cell.getValue() as AdminSubscription['plan'];
        return p?.name ?? 'Sin plan';
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
      title: 'Estado',
      field: 'status',
      minWidth: 110,
      headerFilter: 'list' as const,
      headerFilterParams: {
        values: {
          '': 'Todos',
          active: 'Activo',
          trialing: 'En prueba',
          past_due: 'Pago pendiente',
          unpaid: 'Impagado',
          incomplete: 'Incompleta',
          incomplete_expired: 'Incompleta expirada',
          paused: 'Pausada',
          expired: 'Expirado',
          cancelled: 'Cancelado',
        },
        clearable: true,
      },
      formatter: (cell) => {
        const status = cell.getValue() as string;
        const key = isStorageSubscriptionStatus(status) ? status : 'paused';
        const span = document.createElement('span');
        span.className = STORAGE_SUBSCRIPTION_STATUS_CLASSES[key] ?? STORAGE_SUBSCRIPTION_STATUS_CLASSES.paused;
        span.textContent = STORAGE_SUBSCRIPTION_STATUS_LABELS[key] ?? status;
        return span;
      },
    },
    {
      title: 'Vence',
      field: 'current_period_end',
      minWidth: 100,
      sorter: 'date',
      sorterParams: { format: 'iso' },
      formatter: (cell) => {
        const span = document.createElement('span');
        span.className = 'text-xs text-slate-400';
        span.textContent = new Date(cell.getValue() as string).toLocaleDateString('es-ES');
        return span;
      },
    },
    {
      title: 'Acciones',
      field: '_actions',
      headerSort: false,
      minWidth: 150,
      hozAlign: 'right',
      formatter: (cell) => {
        const s = cell.getData() as AdminSubscription;
        const editBtn = makeEditBtn('Modificar');
        const delBtn = makeDeleteBtn();
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dispatchAction(cell.getElement(), 'edit', s);
        });
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dispatchAction(cell.getElement(), 'delete', s);
        });
        return makeActionsContainer(editBtn, delBtn);
      },
    },
  ];

  return (
    <div ref={wrapperRef} className="space-y-4">
      <AdminTabulatorTable<AdminSubscription>
        data={subscriptions}
        columns={columns}
        exportFileName="suscripciones"
        selectable
        onBulkAction={handleBulkDelete}
        bulkActionLabel="Eliminar seleccionadas"
      />

      <ConfirmDialog
        open={!!confirmSub}
        onOpenChange={(open) => !open && setConfirmSub(null)}
        title="Eliminar suscripción"
        description={`¿Eliminar permanentemente la suscripción de ${confirmSub?.profile?.full_name ?? confirmSub?.user_id}?`}
        loading={deletingId !== null}
        onConfirm={() => confirmSub && handleDelete(confirmSub.id)}
      />
    </div>
  );
}
