import Link from 'next/link';
import { getStripe } from '@/lib/stripe/server';
import type { Stripe } from '@/lib/stripe/server';
import { tServer } from '@/i18n/server';
import { formatCurrency } from '@/lib/utils';
import InvoicesTable, { InvoiceRow } from './InvoicesTable';

export const dynamic = 'force-dynamic';

type StatusMap = Record<string, string>;

type InvoiceStatus = Stripe.Invoice.Status;

type InvoiceWithLinks = Stripe.Invoice & {
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
};

const STATUS_ORDER: InvoiceStatus[] = [
  'draft',
  'open',
  'uncollectible',
  'paid',
  'void',
];

function formatDate(seconds: number | null | undefined, formatter: Intl.DateTimeFormat) {
  if (!seconds) return '—';
  return formatter.format(new Date(seconds * 1000));
}

function formatInvoiceStatus(
  invoice: InvoiceWithLinks,
  statusLabels: StatusMap,
  pastDueLabel: string,
): { status: string; pastDue: boolean } {
  const statusRaw = invoice.status as InvoiceStatus;
  const badge = (invoice as any).status_transitions?.marked_uncollectible ? 'uncollectible' : statusRaw;
  const pastDue = invoice.status === 'open' && Boolean(invoice.due_date) && (invoice.due_date ?? 0) * 1000 < Date.now();

  let label = statusLabels[badge] || badge;
  if (pastDue) {
    label = statusLabels['past_due'] || pastDueLabel;
  }

  return { status: label, pastDue };
}

function getCustomerDisplay(customer: Stripe.Invoice['customer']): string | null {
  if (!customer) return null;
  if (typeof customer === 'string') return customer;
  if ('deleted' in customer && customer.deleted) return customer.id;
  const full = customer as Stripe.Customer;
  return full.name || full.email || full.id;
}

export default async function InvoicesPage() {
  const stripe = getStripe();
  const { t, locale } = await tServer();

  const invoicesResponse = await stripe.invoices.list({
    limit: 50,
    expand: ['data.customer'],
  });

  const invoices = invoicesResponse.data as InvoiceWithLinks[];

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const statusLabels: StatusMap = {
    draft: t('stripe_invoices_status_draft') || 'Draft',
    open: t('stripe_invoices_status_open') || 'Open',
    paid: t('stripe_invoices_status_paid') || 'Paid',
    uncollectible: t('stripe_invoices_status_uncollectible') || 'Uncollectible',
    void: t('stripe_invoices_status_void') || 'Void',
    past_due: t('stripe_invoices_status_past_due') || 'Past due',
  };

  const rows: InvoiceRow[] = invoices.map((invoice) => {
    const invoiceId = invoice.id ?? 'unknown-invoice';
    const { status, pastDue } = formatInvoiceStatus(invoice, statusLabels, statusLabels.past_due);

    const amountDueMinor = invoice.amount_due ?? 0;
    const currency = invoice.currency ?? 'eur';
    const amountDue = formatCurrency(amountDueMinor / 100, currency);

    const dashboardUrl = `https://dashboard.stripe.com/${invoice.livemode ? '' : 'test/'}invoices/${invoiceId}`;

    return {
      id: invoiceId,
      number: invoice.number ?? null,
      customer: getCustomerDisplay(invoice.customer),
      amountDue,
      status,
      statusRaw: invoice.status || 'open',
      dueDate: formatDate(invoice.due_date ?? null, dateFormatter),
      dueDateRaw: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      created: formatDate(invoice.created ?? null, dateFormatter),
      createdRaw: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
      hostedUrl: invoice.hosted_invoice_url ?? null,
      pdfUrl: invoice.invoice_pdf ?? null,
      dashboardUrl,
      pastDue,
    };
  });

  const labels = {
    actions: t('acciones') || 'Actions',
    viewInStripe: t('stripe_invoices_view_dashboard') || 'View in Stripe',
    viewPdf: t('stripe_invoices_view_pdf') || 'View PDF',
    viewHosted: t('stripe_invoices_view_hosted') || 'Hosted page',
    empty: t('stripe_invoices_empty') || 'There are no invoices yet.',
    noCustomer: t('stripe_invoices_no_customer') || 'No customer',
    noNumber: t('stripe_invoices_no_number') || 'No number',
    filtersTitle: t('stripe_invoices_filters_title') || 'Filter invoices',
    filtersStatus: t('stripe_invoices_filters_status') || 'Status',
    filtersStatusAll: t('stripe_invoices_filters_status_all') || 'All',
    filtersSearch: t('stripe_invoices_filters_search') || 'Search',
    filtersSearchPlaceholder:
      t('stripe_invoices_filters_search_placeholder') || 'Search by customer, number, or ID',
    resultsPrefix: t('stripe_invoices_results_prefix') || 'Showing',
    resultsSuffix: t('stripe_invoices_results_suffix') || 'records',
    pastDueBadge: t('stripe_invoices_past_due_badge') || 'Past due',
    columns: {
      id: t('stripe_invoices_column_id') || 'Invoice',
      number: t('stripe_invoices_column_number') || 'Number',
      customer: t('stripe_invoices_column_customer') || 'Customer',
      amountDue: t('stripe_invoices_column_amount_due') || 'Amount due',
      status: t('stripe_invoices_column_status') || 'Status',
      dueDate: t('stripe_invoices_column_due_date') || 'Due date',
      created: t('stripe_invoices_column_created') || 'Created',
      actions: t('stripe_invoices_column_actions') || 'Actions',
    },
  } as const;

  const statusOptions = STATUS_ORDER.filter((value) => statusLabels[value]).map((value) => ({
    value,
    label: statusLabels[value],
  }));

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            {t('stripe_invoices_title') || 'Invoices'}
          </h1>
          <p className="text-sm text-slate-400">
            {t('stripe_invoices_description') ||
              'Monitor invoice statuses, due dates, and outstanding balances.'}
          </p>
        </div>
        <Link
          href="https://dashboard.stripe.com/invoices"
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-emerald-500 px-3 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/10"
        >
          {t('stripe_invoices_view_dashboard') || 'View in Stripe'}
        </Link>
      </div>

      <InvoicesTable rows={rows} labels={labels} statusOptions={statusOptions} />
    </section>
  );
}
