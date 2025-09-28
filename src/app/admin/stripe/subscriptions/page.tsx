import Link from 'next/link';
import { getStripe } from '@/lib/stripe/server';
import type { Stripe } from '@/lib/stripe/server';
import { tServer } from '@/i18n/server';
import { formatCurrency } from '@/lib/utils';
import SubscriptionsTable, { SubscriptionRow } from './SubscriptionsTable';

export const dynamic = 'force-dynamic';

type StatusMap = Record<string, string>;

const STATUS_ORDER: (Stripe.Subscription.Status | 'paused')[] = [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'paused',
];

export default async function SubscriptionsPage() {
  const stripe = getStripe();
  const { t, locale } = await tServer();

  const subscriptions = await stripe.subscriptions.list({
    limit: 50,
    expand: ['data.customer', 'data.items.data.price'],
  });

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const statusLabels: StatusMap = {
    active: t('stripe_subscriptions_status_active') || 'Active',
    trialing: t('stripe_subscriptions_status_trialing') || 'Trialing',
    past_due: t('stripe_subscriptions_status_past_due') || 'Past due',
    canceled: t('stripe_subscriptions_status_canceled') || 'Canceled',
    unpaid: t('stripe_subscriptions_status_unpaid') || 'Unpaid',
    incomplete: t('stripe_subscriptions_status_incomplete') || 'Incomplete',
    incomplete_expired:
      t('stripe_subscriptions_status_incomplete_expired') || 'Incomplete expired',
    paused: t('stripe_subscriptions_status_paused') || 'Paused',
  };

  const intervalLabels: Record<string, string> = {
    day: t('stripe_price_interval_day') || 'Daily',
    week: t('stripe_price_interval_week') || 'Weekly',
    month: t('stripe_price_interval_month') || 'Monthly',
    year: t('stripe_price_interval_year') || 'Yearly',
  };

  const rows: SubscriptionRow[] = subscriptions.data.map((subscription) => {
    const item = subscription.items.data[0] as Stripe.SubscriptionItem | undefined;
    const price = item?.price as Stripe.Price | undefined;

    let planName: string | null = null;
    if (price?.nickname) {
      planName = price.nickname;
    } else if (price?.product && typeof price.product !== 'string') {
      const product = price.product as Stripe.Product;
      planName = product.name ?? product.id;
    }

    let amountDisplay: string | null = null;
    if (price?.unit_amount != null) {
      const currency = price.currency ?? 'eur';
      amountDisplay = formatCurrency(price.unit_amount / 100, currency);
    }

    const intervalRaw = price?.recurring?.interval ?? null;
    const intervalLabel = intervalRaw ? intervalLabels[intervalRaw] ?? intervalRaw : null;

    const customer = subscription.customer;
    let customerName: string | null = null;
    if (typeof customer === 'string') {
      customerName = customer;
    } else if (customer && !('deleted' in customer && customer.deleted)) {
      const fullCustomer = customer as Stripe.Customer;
      customerName = fullCustomer.name || fullCustomer.email || fullCustomer.id;
    }

    const periodEndSeconds = (subscription as Stripe.Subscription & {
      current_period_end?: number;
    }).current_period_end;

    const periodEnd = periodEndSeconds
      ? dateFormatter.format(new Date(periodEndSeconds * 1000))
      : '—';

    const statusRaw = (subscription.status ?? 'active') as Stripe.Subscription.Status | 'paused';
    const status = statusLabels[statusRaw] || statusRaw;
    const dashboardUrl = `https://dashboard.stripe.com/${subscription.livemode ? '' : 'test/'}subscriptions/${subscription.id}`;

    return {
      id: subscription.id,
      plan: planName,
      amountDisplay,
      interval: intervalLabel,
      status,
      statusRaw,
      customer: customerName,
      periodEnd,
      dashboardUrl,
    };
  });

  const labels = {
    actions: t('acciones') || 'Actions',
    viewInStripe: t('stripe_subscriptions_view_dashboard') || 'View in Stripe',
    empty: t('stripe_subscriptions_empty') || 'There are no subscriptions yet.',
    noPlan: t('stripe_subscriptions_no_plan') || 'No plan',
    filtersTitle: t('stripe_subscriptions_filters_title') || 'Filter subscriptions',
    filtersStatus: t('stripe_subscriptions_filters_status') || 'Status',
    filtersStatusAll: t('stripe_subscriptions_filters_status_all') || 'All',
    filtersSearch: t('stripe_subscriptions_filters_search') || 'Search',
    filtersSearchPlaceholder:
      t('stripe_subscriptions_filters_search_placeholder') || 'Search by customer or ID',
    resultsPrefix: t('stripe_subscriptions_results_prefix') || 'Showing',
    resultsSuffix: t('stripe_subscriptions_results_suffix') || 'records',
    columns: {
      id: t('stripe_subscriptions_column_id') || 'Subscription',
      plan: t('stripe_subscriptions_column_plan') || 'Plan',
      amount: t('stripe_subscriptions_column_amount') || 'Amount',
      interval: t('stripe_subscriptions_column_interval') || 'Interval',
      status: t('stripe_subscriptions_column_status') || 'Status',
      customer: t('stripe_subscriptions_column_customer') || 'Customer',
      periodEnd: t('stripe_subscriptions_column_period_end') || 'Renewal',
    },
  } as const;

  const statusOptions = STATUS_ORDER.filter((key) => statusLabels[key]).map((key) => ({
    value: key,
    label: statusLabels[key],
  }));

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            {t('stripe_subscriptions_title') || 'Subscriptions'}
          </h1>
          <p className="text-sm text-slate-400">
            {t('stripe_subscriptions_description') ||
              'Track subscription status and renewal periods.'}
          </p>
        </div>
        <Link
          href="https://dashboard.stripe.com/subscriptions"
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-emerald-500 px-3 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/10"
        >
          {t('stripe_subscriptions_view_dashboard') || 'View in Stripe'}
        </Link>
      </div>

      <SubscriptionsTable rows={rows} labels={labels} statusOptions={statusOptions} />
    </section>
  );
}
