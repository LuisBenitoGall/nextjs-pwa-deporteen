'use client';

import type { ColumnDefinition } from 'tabulator-tables';
import AdminTabulatorTable from '@/components/admin/shared/AdminTabulatorTable';
import { makeActionsContainer, makeExternalLinkBtn } from '@/components/admin/shared/tabulatorUtils';

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
      title: labels.columns.number,
      field: 'number',
      minWidth: 100,
      headerFilter: 'input' as const,
      formatter: (cell) => (cell.getValue() as string | null) ?? labels.noNumber,
    },
    {
      title: labels.columns.customer,
      field: 'customer',
      minWidth: 160,
      headerFilter: 'input' as const,
      formatter: (cell) => (cell.getValue() as string | null) ?? labels.noCustomer,
    },
    {
      title: labels.columns.amountDue,
      field: 'amountDue',
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
      minWidth: 110,
      headerFilter: 'list' as const,
      headerFilterParams: { values: statusValues, clearable: true },
      formatter: (cell) => {
        const r = cell.getData() as InvoiceRow;
        const div = document.createElement('div');
        div.className = 'flex items-center gap-1.5';
        const text = document.createElement('span');
        text.textContent = r.status;
        div.appendChild(text);
        if (r.pastDue) {
          const badge = document.createElement('span');
          badge.className =
            'rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300';
          badge.textContent = labels.pastDueBadge;
          div.appendChild(badge);
        }
        return div;
      },
    },
    {
      title: labels.columns.dueDate,
      field: 'dueDate',
      minWidth: 100,
      formatter: (cell) => cell.getValue() as string,
    },
    {
      title: labels.columns.created,
      field: 'created',
      minWidth: 100,
      formatter: (cell) => cell.getValue() as string,
    },
    {
      title: labels.columns.actions,
      field: '_actions',
      headerSort: false,
      minWidth: 180,
      hozAlign: 'right',
      formatter: (cell) => {
        const r = cell.getData() as InvoiceRow;
        const actions: HTMLElement[] = [makeExternalLinkBtn(r.dashboardUrl, labels.viewInStripe)];
        if (r.hostedUrl) actions.push(makeExternalLinkBtn(r.hostedUrl, labels.viewHosted));
        if (r.pdfUrl) actions.push(makeExternalLinkBtn(r.pdfUrl, labels.viewPdf));
        return makeActionsContainer(...actions);
      },
    },
  ];

  return (
    <AdminTabulatorTable<InvoiceRow>
      data={rows}
      columns={columns}
      exportFileName="facturas-stripe"
    />
  );
}
