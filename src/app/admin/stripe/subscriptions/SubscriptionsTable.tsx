'use client';

import type { ColumnDefinition } from 'tabulator-tables';
import AdminTabulatorTable from '@/components/admin/shared/AdminTabulatorTable';

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

export default function SubscriptionsTable({
  rows,
  labels,
  statusOptions,
}: SubscriptionsTableProps) {
  const statusValues: Record<string, string> = { '': labels.filtersStatusAll };
  statusOptions.forEach((o) => { statusValues[o.value] = o.label; });

  const columns: ColumnDefinition[] = [
    {
      title: labels.columns.id,
      field: 'id',
      minWidth: 120,
      headerFilter: 'input' as const,
      formatter: (cell) => {
        const span = document.createElement('span');
        span.className = 'font-mono text-xs text-slate-300';
        span.textContent = cell.getValue() as string;
        return span;
      },
    },
    {
      title: labels.columns.plan,
      field: 'plan',
      minWidth: 120,
      headerFilter: 'input' as const,
      formatter: (cell) => (cell.getValue() as string | null) ?? labels.noPlan,
    },
    {
      title: labels.columns.amount,
      field: 'amountDisplay',
      minWidth: 100,
      formatter: (cell) => (cell.getValue() as string | null) ?? '—',
    },
    {
      title: labels.columns.interval,
      field: 'interval',
      minWidth: 90,
      formatter: (cell) => (cell.getValue() as string | null) ?? '—',
    },
    {
      title: labels.columns.status,
      field: 'statusRaw',
      minWidth: 100,
      headerFilter: 'list' as const,
      headerFilterParams: { values: statusValues, clearable: true },
      formatter: (cell) => (cell.getData() as SubscriptionRow).status,
    },
    {
      title: labels.columns.customer,
      field: 'customer',
      minWidth: 160,
      headerFilter: 'input' as const,
      formatter: (cell) => (cell.getValue() as string | null) ?? '—',
    },
    {
      title: labels.columns.periodEnd,
      field: 'periodEnd',
      minWidth: 110,
      formatter: (cell) => cell.getValue() as string,
    },
    {
      title: labels.actions,
      field: '_actions',
      headerSort: false,
      minWidth: 110,
      hozAlign: 'right',
      formatter: (cell) => {
        const r = cell.getData() as SubscriptionRow;
        const a = document.createElement('a');
        a.href = r.dashboardUrl;
        a.target = '_blank';
        a.rel = 'noreferrer';
        a.className = 'text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors';
        a.textContent = labels.viewInStripe;
        return a;
      },
    },
  ];

  return (
    <AdminTabulatorTable<SubscriptionRow>
      data={rows}
      columns={columns}
      exportFileName="suscripciones-stripe"
    />
  );
}
