import Link from 'next/link';
import { getStripe } from '@/lib/stripe/server';
import type { Stripe } from '@/lib/stripe/server';
import { tServer } from '@/i18n/server';
import { formatCurrency } from '@/lib/utils';
import CouponsTable, { CouponRow } from './CouponsTable';
import CreateCouponForm from './CreateCouponForm';

export const dynamic = 'force-dynamic';

type StatusMap = Record<string, string>;

type CouponStatus = 'active' | 'expired' | 'maxed';

const STATUS_ORDER: CouponStatus[] = ['active', 'expired', 'maxed'];

type TranslateFn = Awaited<ReturnType<typeof tServer>>['t'];

function formatDuration(
  coupon: Stripe.Coupon,
  t: TranslateFn,
  fallback: string,
): string {
  if (coupon.duration === 'forever') {
    return t('stripe_coupons_duration_forever') || 'Forever';
  }
  if (coupon.duration === 'once') {
    return t('stripe_coupons_duration_once') || 'Once';
  }
  if (coupon.duration === 'repeating') {
    const months = coupon.duration_in_months ?? 0;
    return (t('stripe_coupons_duration_repeating', { months }) || `For ${months} months`).replace('{months}', String(months));
  }
  return fallback;
}

function formatValue(coupon: Stripe.Coupon, t: TranslateFn): {
  valueDisplay: string;
  typeDisplay: string;
} {
  if (coupon.percent_off != null) {
    return {
      valueDisplay: `${coupon.percent_off}%`,
      typeDisplay: t('stripe_coupons_value_percent') || 'Percent off',
    };
  }

  if (coupon.amount_off != null && coupon.currency) {
    return {
      valueDisplay: formatCurrency(coupon.amount_off / 100, coupon.currency),
      typeDisplay: t('stripe_coupons_value_amount') || 'Fixed discount',
    };
  }

  return {
    valueDisplay: '—',
    typeDisplay: '—',
  };
}

function determineStatus(coupon: Stripe.Coupon): CouponStatus {
  const redeemExpired = typeof coupon.redeem_by === 'number' && coupon.redeem_by * 1000 < Date.now();
  if (coupon.valid === false || redeemExpired) {
    return 'expired';
  }
  const maxRedemptionsReached =
    typeof coupon.max_redemptions === 'number' && coupon.times_redeemed >= coupon.max_redemptions;
  if (maxRedemptionsReached) {
    return 'maxed';
  }
  return 'active';
}

export default async function CouponsPage() {
  const stripe = getStripe();
  const { t, locale } = await tServer();

  const coupons = await stripe.coupons.list({ limit: 100 });

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
  });

  const statusLabels: StatusMap = {
    active: t('stripe_coupons_status_active') || 'Active',
    expired: t('stripe_coupons_status_expired') || 'Expired',
    maxed: t('stripe_coupons_status_maxed') || 'Max redemptions reached',
  };

  const rows: CouponRow[] = coupons.data.map((coupon) => {
    const { valueDisplay, typeDisplay } = formatValue(coupon, t);
    const durationDisplay = formatDuration(coupon, t, '—');

    const maxRedemptions = coupon.max_redemptions ?? null;
    const redemptionsDisplay = maxRedemptions
      ? `${coupon.times_redeemed}/${maxRedemptions}`
      : String(coupon.times_redeemed ?? 0);

    const statusRaw = determineStatus(coupon);
    const status = statusLabels[statusRaw] || statusRaw;

    const redeemByDate = coupon.redeem_by ? new Date(coupon.redeem_by * 1000) : null;
    const redeemByDisplay = redeemByDate
      ? dateFormatter.format(redeemByDate)
      : t('stripe_coupons_no_redeem_by') || 'No date';

    const dashboardUrl = `https://dashboard.stripe.com/${coupon.livemode ? '' : 'test/'}coupons/${coupon.id}`;

    return {
      id: coupon.id,
      name: coupon.name ?? null,
      valueDisplay,
      typeDisplay,
      durationDisplay,
      redemptionsDisplay,
      status,
      statusRaw,
      redeemBy: redeemByDisplay,
      redeemByRaw: redeemByDate ? redeemByDate.toISOString().slice(0, 10) : null,
      maxRedemptionsRaw: maxRedemptions,
      metadata: coupon.metadata ? { ...coupon.metadata } : null,
      dashboardUrl,
    };
  });

  const labels = {
    actions: t('acciones') || 'Actions',
    viewInStripe: t('stripe_coupons_view_dashboard') || 'View in Stripe',
    empty: t('stripe_coupons_empty') || 'There are no coupons yet.',
    delete: t('stripe_coupons_delete') || 'Delete',
    deleteConfirm:
      t('stripe_coupons_delete_confirm') ||
      'Are you sure you want to delete this coupon? This action cannot be undone.',
    deleteError: t('stripe_coupons_delete_error') || "We couldn't delete the coupon.",
    deleteSuccess: t('stripe_coupons_delete_success') || 'Coupon deleted successfully.',
    cancel: t('stripe_coupons_create_cancel') || t('stripe_modal_close') || 'Cancel',
    filtersTitle: t('stripe_coupons_filters_title') || 'Filter coupons',
    filtersStatus: t('stripe_coupons_filters_status') || 'Status',
    filtersStatusAll: t('stripe_coupons_filters_status_all') || 'All',
    filtersSearch: t('stripe_coupons_filters_search') || 'Search',
    filtersSearchPlaceholder:
      t('stripe_coupons_filters_search_placeholder') || 'Search by code or name',
    resultsPrefix: t('stripe_coupons_results_prefix') || 'Showing',
    resultsSuffix: t('stripe_coupons_results_suffix') || 'records',
    columns: {
      code: t('stripe_coupons_column_code') || 'Coupon',
      value: t('stripe_coupons_column_value') || 'Value',
      type: t('stripe_coupons_column_type') || 'Type',
      duration: t('stripe_coupons_column_duration') || 'Duration',
      redemptions: t('stripe_coupons_column_redemptions') || 'Redemptions',
      status: t('stripe_coupons_column_status') || 'Status',
      redeemBy: t('stripe_coupons_column_redeem_by') || 'Redeem by',
      metadata: t('stripe_coupons_column_metadata') || 'Metadata',
    },
  } as const;

  const statusOptions = STATUS_ORDER.map((value) => ({
    value,
    label: statusLabels[value],
  }));

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            {t('stripe_coupons_title') || 'Coupons'}
          </h1>
          <p className="text-sm text-slate-400">
            {t('stripe_coupons_description') || 'Manage the discount codes available in Stripe.'}
          </p>
        </div>
        <Link
          href="https://dashboard.stripe.com/coupons"
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-emerald-500 px-3 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/10"
        >
          {t('stripe_coupons_view_dashboard') || 'View in Stripe'}
        </Link>
      </div>

      <div className="flex justify-between gap-3">
        <CreateCouponForm />
      </div>

      <CouponsTable rows={rows} labels={labels} statusOptions={statusOptions} />
    </section>
  );
}
