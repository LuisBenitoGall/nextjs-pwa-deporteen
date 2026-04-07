'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ColumnDefinition } from 'tabulator-tables';
import AdminTabulatorTable from '@/components/admin/shared/AdminTabulatorTable';
import {
  makeDeleteBtn,
  makeEditBtn,
  makeActionsContainer,
  dispatchAction,
} from '@/components/admin/shared/tabulatorUtils';
import EditCouponDialog from './EditCouponDialog';

interface StatusOption {
  value: string;
  label: string;
}

export interface CouponRow {
  id: string;
  name: string | null;
  valueDisplay: string;
  typeDisplay: string;
  durationDisplay: string;
  redemptionsDisplay: string;
  status: string;
  statusRaw: string;
  redeemBy: string;
  redeemByRaw: string | null;
  maxRedemptionsRaw: number | null;
  metadata: Record<string, string> | null;
  dashboardUrl: string;
}

export interface CouponsTableLabels {
  actions: string;
  viewInStripe: string;
  empty: string;
  delete: string;
  deleteConfirm: string;
  deleteError: string;
  deleteSuccess: string;
  cancel: string;
  filtersTitle: string;
  filtersStatus: string;
  filtersStatusAll: string;
  filtersSearch: string;
  filtersSearchPlaceholder: string;
  resultsPrefix: string;
  resultsSuffix: string;
  columns: {
    code: string;
    value: string;
    type: string;
    duration: string;
    redemptions: string;
    status: string;
    redeemBy: string;
    metadata: string;
  };
}

interface CouponsTableProps {
  rows: CouponRow[];
  labels: CouponsTableLabels;
  statusOptions: StatusOption[];
}

export default function CouponsTable({ rows, labels, statusOptions }: CouponsTableProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<CouponRow | null>(null);
  const [editCoupon, setEditCoupon] = useState<CouponRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Bridge: listen for Tabulator action events
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const { action, row } = (e as CustomEvent<{ action: string; row: CouponRow }>).detail;
      if (action === 'edit') {
        setEditCoupon(row);
        setEditOpen(true);
      }
      if (action === 'delete') {
        setCouponToDelete(row);
        setConfirmOpen(true);
      }
    };
    el.addEventListener('tabulator-action', handler);
    return () => el.removeEventListener('tabulator-action', handler);
  }, []);

  function closeDialog() {
    if (deletingId) return;
    setConfirmOpen(false);
    setCouponToDelete(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const response = await fetch('/api/admin/stripe/coupons', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponId: id }),
      });
      if (!response.ok) throw new Error(await response.text());
      showToast({ title: labels.deleteSuccess, variant: 'success' });
      router.refresh();
    } catch {
      showToast({ title: labels.deleteError, variant: 'destructive' });
    } finally {
      setDeletingId(null);
      setConfirmOpen(false);
      setCouponToDelete(null);
    }
  }

  // Build status values for list header filter
  const statusValues: Record<string, string> = { '': labels.filtersStatusAll };
  statusOptions.forEach((o) => { statusValues[o.value] = o.label; });

  const columns: ColumnDefinition[] = [
    {
      title: labels.columns.code,
      field: 'id',
      minWidth: 140,
      headerFilter: 'input' as const,
      formatter: (cell) => {
        const r = cell.getData() as CouponRow;
        const div = document.createElement('div');
        div.innerHTML =
          `<div class="font-semibold text-slate-100 font-mono text-xs">${r.id}</div>` +
          (r.name ? `<div class="text-xs text-slate-400">${r.name}</div>` : '');
        return div;
      },
    },
    {
      title: labels.columns.value,
      field: 'valueDisplay',
      minWidth: 90,
      formatter: (cell) => cell.getValue() as string,
    },
    {
      title: labels.columns.type,
      field: 'typeDisplay',
      minWidth: 100,
      formatter: (cell) => cell.getValue() as string,
    },
    {
      title: labels.columns.duration,
      field: 'durationDisplay',
      minWidth: 100,
      formatter: (cell) => cell.getValue() as string,
    },
    {
      title: labels.columns.redemptions,
      field: 'redemptionsDisplay',
      minWidth: 100,
      formatter: (cell) => cell.getValue() as string,
    },
    {
      title: labels.columns.status,
      field: 'statusRaw',
      minWidth: 100,
      headerFilter: 'list' as const,
      headerFilterParams: { values: statusValues, clearable: true },
      formatter: (cell) => {
        const span = document.createElement('span');
        span.className = 'text-slate-300';
        span.textContent = (cell.getData() as CouponRow).status;
        return span;
      },
    },
    {
      title: labels.columns.redeemBy,
      field: 'redeemBy',
      minWidth: 100,
      formatter: (cell) => cell.getValue() as string,
    },
    {
      title: labels.columns.metadata,
      field: 'metadata',
      minWidth: 120,
      headerSort: false,
      formatter: (cell) => {
        const v = cell.getValue() as Record<string, string> | null;
        const span = document.createElement('span');
        span.className = 'text-xs text-slate-400';
        span.textContent = v ? JSON.stringify(v) : '—';
        return span;
      },
    },
    {
      title: labels.actions,
      field: '_actions',
      headerSort: false,
      minWidth: 180,
      hozAlign: 'right',
      formatter: (cell) => {
        const r = cell.getData() as CouponRow;

        const editBtn = makeEditBtn();
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dispatchAction(cell.getElement(), 'edit', r);
        });

        const linkBtn = document.createElement('a');
        linkBtn.href = r.dashboardUrl;
        linkBtn.target = '_blank';
        linkBtn.rel = 'noreferrer';
        linkBtn.className =
          'inline-flex items-center gap-1 h-7 px-2 rounded text-xs border border-slate-700 text-emerald-400 hover:text-emerald-300 transition-colors';
        linkBtn.textContent = labels.viewInStripe;

        const delBtn = makeDeleteBtn(labels.delete);
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dispatchAction(cell.getElement(), 'delete', r);
        });

        return makeActionsContainer(editBtn, linkBtn as unknown as HTMLButtonElement, delBtn);
      },
    },
  ];

  return (
    <div ref={wrapperRef} className="space-y-4">
      <AdminTabulatorTable<CouponRow>
        data={rows}
        columns={columns}
        exportFileName="cupones-stripe"
        selectable
        onBulkAction={async (selected) => {
          for (const r of selected) {
            await fetch('/api/admin/stripe/coupons', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ couponId: r.id }),
            });
          }
          showToast({ title: `${selected.length} cupones eliminados`, variant: 'success' });
          router.refresh();
        }}
        bulkActionLabel={labels.delete}
      />

      {/* Edit dialog (controlled externally) */}
      {editCoupon && (
        <EditCouponDialog
          coupon={editCoupon}
          open={editOpen}
          onOpenChange={(v) => {
            setEditOpen(v);
            if (!v) setEditCoupon(null);
          }}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Delete confirm dialog */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => (open ? setConfirmOpen(true) : closeDialog())}
      >
        <DialogContent className="bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>{labels.delete}</DialogTitle>
            <DialogDescription>{labels.deleteConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={closeDialog}
              className="text-slate-300 hover:text-white"
              disabled={deletingId !== null}
            >
              {labels.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => couponToDelete && handleDelete(couponToDelete.id)}
              disabled={deletingId !== null || !couponToDelete}
            >
              {deletingId !== null ? `${labels.delete}…` : labels.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
