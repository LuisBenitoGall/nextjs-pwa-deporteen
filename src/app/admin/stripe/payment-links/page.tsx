import Link from 'next/link';
import { getStripe } from '@/lib/stripe/server';
import type { Stripe } from '@/lib/stripe/server';
import { tServer } from '@/i18n/server';
import { formatCurrency } from '@/lib/utils';
import PaymentLinksTable from './PaymentLinksTable';

export const dynamic = 'force-dynamic';

interface StatusMap {
  [key: string]: string;
}

export default async function PaymentLinksPage() {
  const stripe = getStripe();
  const { t, locale } = await tServer();

  const paymentIntents = await stripe.paymentIntents.list({
    limit: 50,
    expand: ['data.customer', 'data.payment_method'],
  });

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const statusLabels: StatusMap = {
    succeeded: t('stripe_payments_status_succeeded') || 'Succeeded',
    processing: t('stripe_payments_status_processing') || 'Processing',
    requires_payment_method:
      t('stripe_payments_status_requires_payment_method') || 'Requires payment method',
    requires_action: t('stripe_payments_status_requires_action') || 'Requires action',
    canceled: t('stripe_payments_status_canceled') || 'Canceled',
  };

  const rows = paymentIntents.data.map((intent) => {
    const amountMinor = intent.amount_received ?? intent.amount ?? 0;
    const currency = intent.currency ?? 'eur';
    const amountDisplay = formatCurrency(amountMinor / 100, currency);

    const { customer } = intent;
    let customerName: string | null = null;
    if (typeof customer === 'string') {
      customerName = customer;
    } else if (customer && !('deleted' in customer && customer.deleted)) {
      const fullCustomer = customer as Stripe.Customer;
      customerName = fullCustomer.name || fullCustomer.email || fullCustomer.id;
    }

    const { payment_method: paymentMethod } = intent;
    let methodLabel: string | null = null;
    if (paymentMethod && typeof paymentMethod !== 'string') {
      const pm = paymentMethod as Stripe.PaymentMethod;
      if (pm.card) {
        const brand = pm.card.brand ? pm.card.brand.toUpperCase() : null;
        const last4 = pm.card.last4 ? `**** ${pm.card.last4}` : null;
        methodLabel = [brand, last4].filter(Boolean).join(' ');
      } else {
        methodLabel = pm.type ?? pm.id;
      }
    } else if (typeof paymentMethod === 'string') {
      methodLabel = paymentMethod;
    }

    const created = intent.created ? dateFormatter.format(new Date(intent.created * 1000)) : '—';
    const statusRaw = intent.status;
    const status = statusLabels[statusRaw] || statusRaw;
    const dashboardUrl = `https://dashboard.stripe.com/${intent.livemode ? '' : 'test/'}payments/${intent.id}`;

    return {
      id: intent.id,
      amountDisplay,
      status,
      statusRaw,
      customer: customerName,
      method: methodLabel,
      created,
      dashboardUrl,
    };
  });

  const labels = {
    actions: t('acciones') || 'Actions',
    viewInStripe: t('stripe_payments_view_dashboard') || 'View in Stripe',
    empty: t('stripe_payments_empty') || 'There are no one-time payments yet.',
    noCustomer: t('stripe_payments_no_customer') || 'No customer',
    noMethod: t('stripe_payments_no_method') || 'No method',
    filtersTitle: t('stripe_payments_filters_title') || 'Filter payments',
    filtersStatus: t('stripe_payments_filters_status') || 'Status',
    filtersStatusAll: t('stripe_payments_filters_status_all') || 'All',
    filtersSearch: t('stripe_payments_filters_search') || 'Search',
    filtersSearchPlaceholder:
      t('stripe_payments_filters_search_placeholder') || 'Search by customer or ID',
    resultsPrefix: t('stripe_payments_results_prefix') || 'Showing',
    resultsSuffix: t('stripe_payments_results_suffix') || 'records',
    columns: {
      intent: t('stripe_payments_intent') || 'Intent',
      amount: t('stripe_payments_amount') || 'Amount',
      status: t('stripe_payments_status') || 'Status',
      customer: t('stripe_payments_customer') || 'Customer',
      method: t('stripe_payments_method') || 'Method',
      created: t('stripe_payments_created') || 'Created',
    },
  } as const;

  const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            {t('stripe_payments_title') || 'One-time payments'}
          </h1>
          <p className="text-sm text-slate-400">
            {t('stripe_payments_description') || 'Review the status of one-off charges processed through Stripe.'}
          </p>
        </div>
        <Link
          href="https://dashboard.stripe.com/payments"
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-emerald-500 px-3 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/10"
        >
          {t('stripe_payments_view_dashboard') || 'View in Stripe'}
        </Link>
      </div>

      <PaymentLinksTable rows={rows} labels={labels} statusOptions={statusOptions} />
    </section>
  );
}
