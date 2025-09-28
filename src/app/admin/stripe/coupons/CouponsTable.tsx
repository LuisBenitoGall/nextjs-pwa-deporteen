'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<CouponRow | null>(null);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.statusRaw === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        row.id.toLowerCase().includes(normalizedQuery) ||
        (row.name?.toLowerCase().includes(normalizedQuery) ?? false);
      return matchesStatus && matchesQuery;
    });
  }, [rows, statusFilter, query]);

  function requestDelete(row: CouponRow) {
    setCouponToDelete(row);
    setConfirmOpen(true);
  }

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
      if (!response.ok) {
        throw new Error(await response.text());
      }
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

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 shadow">
      <div className="mb-4 space-y-3">
        <div className="text-sm font-medium text-slate-200">{labels.filtersTitle}</div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            <span className="uppercase tracking-wide">{labels.filtersStatus}</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <option value="all">{labels.filtersStatusAll}</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            <span className="uppercase tracking-wide">{labels.filtersSearch}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={labels.filtersSearchPlaceholder}
              className="h-10 rounded-md border border-slate-700 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </label>
        </div>
      </div>

      <div className="mb-4 text-xs text-slate-400">
        {labels.resultsPrefix} {filteredRows.length} {labels.resultsSuffix}
      </div>

      {filteredRows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
            <thead className="bg-slate-800/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">{labels.columns.code}</th>
                <th className="px-4 py-3 text-left">{labels.columns.value}</th>
                <th className="px-4 py-3 text-left">{labels.columns.type}</th>
                <th className="px-4 py-3 text-left">{labels.columns.duration}</th>
                <th className="px-4 py-3 text-left">{labels.columns.redemptions}</th>
                <th className="px-4 py-3 text-left">{labels.columns.status}</th>
                <th className="px-4 py-3 text-left">{labels.columns.redeemBy}</th>
                <th className="px-4 py-3 text-left">{labels.columns.metadata}</th>
                <th className="px-4 py-3 text-left">{labels.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredRows.map((row) => (
                <tr key={row.id} className="transition hover:bg-slate-800/40">
                  <td className="px-4 py-3 text-slate-200">
                    <div className="font-semibold text-slate-100">{row.id}</div>
                    {row.name && <div className="text-xs text-slate-400">{row.name}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-200">{row.valueDisplay}</td>
                  <td className="px-4 py-3 text-slate-200">{row.typeDisplay}</td>
                  <td className="px-4 py-3 text-slate-200">{row.durationDisplay}</td>
                  <td className="px-4 py-3 text-slate-200">{row.redemptionsDisplay}</td>
                  <td className="px-4 py-3 text-slate-200">{row.status}</td>
                  <td className="px-4 py-3 text-slate-200">{row.redeemBy}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {row.metadata ? JSON.stringify(row.metadata) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <EditCouponDialog coupon={row} />
                      <Link
                        href={row.dashboardUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-emerald-300 transition hover:text-emerald-200"
                      >
                        {labels.viewInStripe}
                      </Link>
                      <Button
                        type="button"
                        variant="destructive"
                        className="h-8 px-3 text-xs"
                        onClick={() => requestDelete(row)}
                        disabled={deletingId !== null}
                      >
                        {deletingId === row.id ? `${labels.delete}…` : labels.delete}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
          {labels.empty}
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={(open) => (open ? setConfirmOpen(true) : closeDialog())}>
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
