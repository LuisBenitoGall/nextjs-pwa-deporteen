'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

interface StatusOption {
  value: string;
  label: string;
}

export interface SubscriptionRow {
  id: string;
  plan: string | null;
  amountDisplay: string | null;
  interval: string | null;
  status: string;
  statusRaw: string;
  customer: string | null;
  periodEnd: string;
  dashboardUrl: string;
}

export interface SubscriptionsTableLabels {
  actions: string;
  viewInStripe: string;
  empty: string;
  noPlan: string;
  filtersTitle: string;
  filtersStatus: string;
  filtersStatusAll: string;
  filtersSearch: string;
  filtersSearchPlaceholder: string;
  resultsPrefix: string;
  resultsSuffix: string;
  columns: {
    id: string;
    plan: string;
    amount: string;
    interval: string;
    status: string;
    customer: string;
    periodEnd: string;
  };
}

interface SubscriptionsTableProps {
  rows: SubscriptionRow[];
  labels: SubscriptionsTableLabels;
  statusOptions: StatusOption[];
}

export default function SubscriptionsTable({ rows, labels, statusOptions }: SubscriptionsTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.statusRaw === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        row.id.toLowerCase().includes(normalizedQuery) ||
        (row.customer?.toLowerCase().includes(normalizedQuery) ?? false) ||
        (row.plan?.toLowerCase().includes(normalizedQuery) ?? false);
      return matchesStatus && matchesQuery;
    });
  }, [rows, statusFilter, query]);

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
              className="h-10 rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </label>
        </div>
        <p className="text-xs text-slate-400">
          {labels.resultsPrefix} {filteredRows.length} {labels.resultsSuffix}
        </p>
      </div>

      {filteredRows.length === 0 ? (
        <p className="text-sm text-slate-400">{labels.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
            <thead className="bg-slate-800/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">{labels.columns.id}</th>
                <th className="px-4 py-3 text-left">{labels.columns.plan}</th>
                <th className="px-4 py-3 text-left">{labels.columns.amount}</th>
                <th className="px-4 py-3 text-left">{labels.columns.interval}</th>
                <th className="px-4 py-3 text-left">{labels.columns.status}</th>
                <th className="px-4 py-3 text-left">{labels.columns.customer}</th>
                <th className="px-4 py-3 text-left">{labels.columns.periodEnd}</th>
                <th className="px-4 py-3 text-left">{labels.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredRows.map((row) => (
                <tr key={row.id} className="transition hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{row.id}</td>
                  <td className="px-4 py-3 text-slate-200">{row.plan ?? labels.noPlan}</td>
                  <td className="px-4 py-3 text-slate-200">{row.amountDisplay ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-200">{row.interval ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-200">{row.status}</td>
                  <td className="px-4 py-3 text-slate-200">{row.customer ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-200">{row.periodEnd}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={row.dashboardUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-emerald-300 transition hover:text-emerald-200"
                    >
                      {labels.viewInStripe}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
