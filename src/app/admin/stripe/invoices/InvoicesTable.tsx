'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

interface StatusOption {
  value: string;
  label: string;
}

export interface InvoiceRow {
  id: string;
  number: string | null;
  customer: string | null;
  amountDue: string;
  status: string;
  statusRaw: string;
  dueDate: string;
  dueDateRaw: string | null;
  created: string;
  createdRaw: string | null;
  hostedUrl: string | null;
  pdfUrl: string | null;
  dashboardUrl: string;
  pastDue: boolean;
}

export interface InvoiceTableLabels {
  actions: string;
  viewInStripe: string;
  viewPdf: string;
  viewHosted: string;
  empty: string;
  noCustomer: string;
  noNumber: string;
  filtersTitle: string;
  filtersStatus: string;
  filtersStatusAll: string;
  filtersSearch: string;
  filtersSearchPlaceholder: string;
  resultsPrefix: string;
  resultsSuffix: string;
  pastDueBadge: string;
  columns: {
    id: string;
    number: string;
    customer: string;
    amountDue: string;
    status: string;
    dueDate: string;
    created: string;
    actions: string;
  };
}

interface InvoicesTableProps {
  rows: InvoiceRow[];
  labels: InvoiceTableLabels;
  statusOptions: StatusOption[];
}

export default function InvoicesTable({ rows, labels, statusOptions }: InvoicesTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.statusRaw === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        row.id.toLowerCase().includes(normalizedQuery) ||
        (row.number?.toLowerCase().includes(normalizedQuery) ?? false) ||
        (row.customer?.toLowerCase().includes(normalizedQuery) ?? false);
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
                <th className="px-4 py-3 text-left">{labels.columns.number}</th>
                <th className="px-4 py-3 text-left">{labels.columns.customer}</th>
                <th className="px-4 py-3 text-left">{labels.columns.amountDue}</th>
                <th className="px-4 py-3 text-left">{labels.columns.status}</th>
                <th className="px-4 py-3 text-left">{labels.columns.dueDate}</th>
                <th className="px-4 py-3 text-left">{labels.columns.created}</th>
                <th className="px-4 py-3 text-left">{labels.columns.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredRows.map((row) => (
                <tr key={row.id} className="transition hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{row.id}</td>
                  <td className="px-4 py-3 text-slate-200">{row.number ?? labels.noNumber}</td>
                  <td className="px-4 py-3 text-slate-200">{row.customer ?? labels.noCustomer}</td>
                  <td className="px-4 py-3 font-medium text-slate-50">{row.amountDue}</td>
                  <td className="px-4 py-3 text-slate-200">
                    <span>{row.status}</span>
                    {row.pastDue && (
                      <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                        {labels.pastDueBadge}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-200">{row.dueDate}</td>
                  <td className="px-4 py-3 text-slate-200">{row.created}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                      <Link
                        href={row.dashboardUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-300 transition hover:text-emerald-200"
                      >
                        {labels.viewInStripe}
                      </Link>
                      {row.hostedUrl ? (
                        <Link
                          href={row.hostedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-300 transition hover:text-emerald-200"
                        >
                          {labels.viewHosted}
                        </Link>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                      {row.pdfUrl ? (
                        <Link
                          href={row.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-300 transition hover:text-emerald-200"
                        >
                          {labels.viewPdf}
                        </Link>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </div>
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
