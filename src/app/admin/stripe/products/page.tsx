import Link from 'next/link';
import { getStripe } from '@/lib/stripe/server';
import { tServer } from '@/i18n/server';
import { formatCurrency } from '@/lib/utils';
import CreateProductForm from './product-form';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const stripe = getStripe();
  const products = await stripe.products.list({ limit: 100, expand: ['data.default_price'] });
  const { t } = await tServer();

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            {t('stripe_admin_products') || 'Productos'}
          </h1>
          <p className="text-sm text-slate-400">
            {t('stripe_products_description') || 'Administra tu catálogo de Stripe desde un único lugar.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CreateProductForm />
          <Link
            href="https://dashboard.stripe.com/products"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-emerald-500 px-3 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/10"
          >
            {t('stripe_open_in_dashboard') || 'Stripe Dashboard'}
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 shadow">
        <h2 className="mb-4 text-lg font-medium text-slate-100">
          {t('stripe_existing_products') || 'Productos existentes'}
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
            <thead className="bg-slate-800/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">{t('nombre') || 'Nombre'}</th>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">{t('descripcion') || 'Descripción'}</th>
                <th className="px-4 py-3 text-left">{t('estado') || 'Estado'}</th>
                <th className="px-4 py-3 text-left">{t('stripe_admin_prices') || 'Planes y precios'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {products.data.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{product.id}</td>
                  <td className="px-4 py-3 text-slate-300">{product.description || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${product.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                      {product.active ? (t('activo') || 'Activo') : (t('inactivo') || 'Inactivo')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-200">
                        {typeof product.default_price === 'string'
                          ? product.default_price
                          : product.default_price
                          ? formatCurrency(
                              (product.default_price.unit_amount ?? 0) / 100,
                              product.default_price.currency
                            )
                          : '—'}
                      </span>
                      <Link
                        href={`/admin/stripe/prices?product=${product.id}`}
                        className="text-xs font-medium text-emerald-300 transition hover:text-emerald-200"
                      >
                        {t('stripe_manage_prices_button') || 'Gestionar' }
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
