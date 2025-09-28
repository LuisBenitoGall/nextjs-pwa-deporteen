import Link from 'next/link';
import { getStripe } from '@/lib/stripe/server';
import type { Stripe } from '@/lib/stripe/server';
import { formatCurrency } from '@/lib/utils';
import { tServer } from '@/i18n/server';
import CreatePriceForm from './price-form';
import PriceTable from './PriceTable';

export const dynamic = 'force-dynamic';

export default async function PricesPage() {
  const stripe = getStripe();
  const [products, prices] = await Promise.all([
    stripe.products.list({ limit: 100, active: true }),
    stripe.prices.list({ limit: 100, expand: ['data.product'] }),
  ]);
  const { t } = await tServer();

  const priceRows = prices.data.map((price) => {
    const productRef = price.product as string | Stripe.Product | Stripe.DeletedProduct | null;

    let productId = '';
    let productName: string | null = null;
    let productDeleted = false;

    if (typeof productRef === 'string') {
      productId = productRef;
    } else if (productRef) {
      productId = productRef.id;
      if ('deleted' in productRef && productRef.deleted) {
        productDeleted = true;
      } else {
        productName = productRef.name;
      }
    }

    const intervalKey = price.recurring?.interval ?? null;
    const intervalLabel = intervalKey ? (t(`stripe_price_interval_${intervalKey}`) || intervalKey) : null;
    const typeDisplay = price.type === 'recurring'
      ? `${t('stripe_price_type_recurring') || 'Recurrente'}${intervalLabel ? ` · ${intervalLabel}` : ''}`
      : t('stripe_price_type_one_time') || 'Pago único';

    const unitAmount = price.unit_amount !== null ? price.unit_amount / 100 : null;
    const amountDisplay = unitAmount !== null
      ? formatCurrency(unitAmount, price.currency)
      : '—';

    const dashboardUrl = `https://dashboard.stripe.com/${price.livemode ? '' : 'test/'}prices/${price.id}`;

    return {
      id: price.id,
      productId,
      productName,
      productDeleted,
      amountDisplay,
      unitAmount,
      currency: price.currency,
      typeDisplay,
      type: price.type,
      interval: intervalKey,
      active: price.active,
      dashboardUrl,
      nickname: typeof price.nickname === 'string' ? price.nickname : null,
    };
  });

  const intervalLabels = {
    day: t('stripe_price_interval_day') || 'Diario',
    week: t('stripe_price_interval_week') || 'Semanal',
    month: t('stripe_price_interval_month') || 'Mensual',
    year: t('stripe_price_interval_year') || 'Anual',
  } as const;

  const labels = {
    product: t('stripe_price_product_label') || 'Producto',
    productId: 'ID',
    deleted: t('stripe_product_deleted') || 'Eliminado en Stripe',
    amount: t('stripe_price_amount_label') || 'Importe',
    amountHint: t('stripe_price_amount_hint') || 'Introduce el importe en la divisa seleccionada.',
    currencyLabel: t('stripe_price_currency_label') || 'Moneda',
    currencyHint: t('stripe_price_currency_hint') || 'La moneda por defecto es EUR.',
    type: t('stripe_price_type_label') || 'Tipo',
    typeLabel: t('stripe_price_type_label') || 'Tipo de cobro',
    typeHint: t('stripe_price_type_hint') || 'Tras crear el precio solo podrás activarlo o desactivarlo.',
    typeOneTime: t('stripe_price_type_one_time') || 'Pago único',
    typeRecurring: t('stripe_price_type_recurring') || 'Recurrente',
    intervalLabel: t('stripe_price_interval_label') || 'Intervalo de cobro',
    intervalLabels,
    status: t('estado') || 'Estado',
    actions: t('stripe_price_manage_actions') || 'Acciones',
    view: t('stripe_price_view_dashboard') || 'Ver en Stripe',
    manageButton: t('stripe_price_manage_button') || 'Gestionar',
    manageTitle: t('stripe_price_manage_title') || 'Gestionar precio',
    manageSubtitle:
      t('stripe_price_manage_subtitle') ||
      'Puedes activar o desactivar el precio y cambiar su nombre interno. Para modificar el importe crea un nuevo precio.',
    nicknameLabel: t('stripe_price_nickname_label') || 'Nombre interno (Stripe)',
    nicknamePlaceholder: t('stripe_price_nickname_placeholder') || 'Ej. Plan anual interno',
    manageSave: t('stripe_price_manage_save') || 'Guardar cambios',
    manageCancel: t('stripe_price_manage_cancel') || 'Cancelar',
    activeBadge: t('stripe_price_active_badge') || 'Activo',
    inactiveBadge: t('stripe_price_inactive_badge') || 'Inactivo',
    updateError: t('stripe_price_update_error') || 'No se pudo actualizar el precio.',
    manageStatusLabel: t('stripe_price_manage_status_label') || 'Estado',
    manageStatusHint:
      t('stripe_price_manage_status_hint') ||
      'Usa este interruptor para activar o desactivar el precio para nuevas compras.',
    archive: t('stripe_price_archive_button') || 'Archivar',
    activate: t('stripe_price_activate_button') || 'Activar',
    confirmArchiveTitle: t('stripe_price_confirm_archive_title') || 'Archivar precio',
    confirmArchiveDescription:
      t('stripe_price_confirm_archive_description') ||
      'Al archivar un precio se mantendrá disponible para las suscripciones existentes, pero no podrá usarse en nuevas compras.',
    confirmArchiveConfirm: t('stripe_price_confirm_archive_confirm') || 'Archivar',
    confirmArchiveCancel: t('stripe_price_confirm_archive_cancel') || 'Cancelar',
    replaceButton: t('stripe_price_replace_button') || 'Reemplazar precio',
    replaceTitle: t('stripe_price_replace_title') || 'Crear nuevo precio',
    replaceDescription:
      t('stripe_price_replace_description') ||
      'Indica los datos del nuevo precio. El precio anterior se archivará automáticamente al finalizar.',
    replaceSubmit: t('stripe_price_replace_submit') || 'Crear nuevo precio',
    replaceCancel: t('stripe_price_replace_cancel') || 'Cancelar',
    replaceError: t('stripe_price_replace_error') || 'No se pudo crear el nuevo precio.',
    paginationPrevious: t('pagination_previous') || 'Anterior',
    paginationNext: t('pagination_next') || 'Siguiente',
  };

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            {t('stripe_admin_prices') || 'Planes y precios'}
          </h1>
          <p className="text-sm text-slate-400">
            {t('stripe_prices_description') || 'Define los importes y monedas de tus planes en Stripe.'}
          </p>
        </div>
        <Link
          href="https://dashboard.stripe.com/products"
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-emerald-500 px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/10"
        >
          {t('stripe_open_in_dashboard') || 'Stripe Dashboard'}
        </Link>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 shadow">
        <h2 className="mb-4 text-lg font-medium text-slate-100">
          {t('stripe_create_price') || 'Crear precio'}
        </h2>
        <CreatePriceForm
          products={products.data.map((product) => ({
            id: product.id,
            name: product.name,
          }))}
        />
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 shadow">
        <h2 className="mb-4 text-lg font-medium text-slate-100">
          {t('stripe_existing_prices') || 'Precios existentes'}
        </h2>
        <PriceTable rows={priceRows} labels={labels} />
      </div>
    </section>
  );
}
