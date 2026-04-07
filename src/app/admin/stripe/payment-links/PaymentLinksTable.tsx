'use client';

import type { ColumnDefinition } from 'tabulator-tables';
import AdminTabulatorTable from '@/components/admin/shared/AdminTabulatorTable';

interface StatusOption {
  value: string;
  label: string;
}

export interface PaymentRow {
  id: string;
  amountDisplay: string;
  status: string;
  statusRaw: string;
  customer: string | null;
  method: string | null;
  created: string;
  dashboardUrl: string;
}

export interface PaymentLinksTableLabels {
  actions: string;
  viewInStripe: string;
  empty: string;
  noCustomer: string;
  noMethod: string;
  filtersTitle: string;
  filtersStatus: string;
  filtersStatusAll: string;
  filtersSearch: string;
  filtersSearchPlaceholder: string;
  resultsPrefix: string;
  resultsSuffix: string;
  columns: {
    intent: string;
    amount: string;
    status: string;
    customer: string;
    method: string;
    created: string;
  };
}

interface PaymentLinksTableProps {
  rows: PaymentRow[];
  labels: PaymentLinksTableLabels;
  statusOptions: StatusOption[];
}

export default function PaymentLinksTable({
  rows,
  labels,
  statusOptions,
}: PaymentLinksTableProps) {
  const statusValues: Record<string, string> = { '': labels.filtersStatusAll };
  statusOptions.forEach((o) => { statusValues[o.value] = o.label; });

  const columns: ColumnDefinition[] = [
    {
      title: labels.columns.intent,
      field: 'id',
      minWidth: 130,
      headerFilter: 'input' as const,
      formatter: (cell) => {
        const span = document.createElement('span');
        span.className = 'font-mono text-xs text-slate-300';
        span.textContent = cell.getValue() as string;
        return span;
      },
    },
    {
      title: labels.columns.amount,
      field: 'amountDisplay',
      minWidth: 100,
      hozAlign: 'right',
      formatter: (cell) => {
        const span = document.createElement('span');
        span.className = 'font-medium text-slate-50';
        span.textContent = cell.getValue() as string;
        return span;
      },
    },
    {
      title: labels.columns.status,
      field: 'statusRaw',
      minWidth: 100,
      headerFilter: 'list' as const,
      headerFilterParams: { values: statusValues, clearable: true },
      formatter: (cell) => (cell.getData() as PaymentRow).status,
    },
    {
      title: labels.columns.customer,
      field: 'customer',
      minWidth: 160,
      headerFilter: 'input' as const,
      formatter: (cell) => (cell.getValue() as string | null) ?? labels.noCustomer,
    },
    {
      title: labels.columns.method,
      field: 'method',
      minWidth: 120,
      headerFilter: 'input' as const,
      formatter: (cell) => (cell.getValue() as string | null) ?? labels.noMethod,
    },
    {
      title: labels.columns.created,
      field: 'created',
      minWidth: 100,
      formatter: (cell) => cell.getValue() as string,
    },
    {
      title: labels.actions,
      field: '_actions',
      headerSort: false,
      minWidth: 110,
      hozAlign: 'right',
      formatter: (cell) => {
        const r = cell.getData() as PaymentRow;
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
    <AdminTabulatorTable<PaymentRow>
      data={rows}
      columns={columns}
      exportFileName="pagos-stripe"
    />
  );
}
