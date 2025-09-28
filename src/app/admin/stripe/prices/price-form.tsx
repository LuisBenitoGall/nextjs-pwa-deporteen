'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ProductOption {
  id: string;
  name: string;
}

interface CreatePriceFormProps {
  products: ProductOption[];
}

export default function CreatePriceForm({ products }: CreatePriceFormProps) {
  const t = useT();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('eur');
  const [type, setType] = useState<'one_time' | 'recurring'>('one_time');
  const [interval, setInterval] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasProducts = products.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!productId) {
      setError(t('stripe_price_error_product_required') || 'Selecciona un producto.');
      return;
    }

    const numericAmount = Number(amount.replace(',', '.'));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError(t('stripe_price_error_amount_required') || 'Introduce un importe válido.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/stripe/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          amount: numericAmount,
          currency,
          type,
          interval: type === 'recurring' ? interval : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Stripe error');
      }

      setAmount('');
      setCurrency('eur');
      setType('one_time');
      setInterval('month');
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="lg"
          className="bg-emerald-500 text-white hover:bg-emerald-500/90"
          disabled={!hasProducts}
        >
          {t('stripe_price_add_button') || 'Agregar precio'}
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle>{t('stripe_price_modal_title') || 'Nuevo precio'}</DialogTitle>
          <DialogDescription>
            {t('stripe_price_modal_subtitle') || 'Configura el importe, la moneda y el tipo de cobro.'}
          </DialogDescription>
        </DialogHeader>

        {!hasProducts ? (
          <div className="rounded-md border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {t('stripe_price_error_product_required') || 'Selecciona un producto.'}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price-product">{t('stripe_price_product_label') || 'Producto'}</Label>
                <select
                  id="price-product"
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price-amount">{t('stripe_price_amount_label') || 'Importe'}</Label>
                <Input
                  id="price-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={t('stripe_product_price_placeholder') || '19.99'}
                />
                <p className="text-xs text-slate-400">
                  {t('stripe_price_amount_hint') || 'Se convertirá automáticamente a céntimos.'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price-currency">{t('stripe_price_currency_label') || 'Moneda'}</Label>
                <select
                  id="price-currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value.toLowerCase())}
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <option value="eur">EUR</option>
                  <option value="usd">USD</option>
                  <option value="gbp">GBP</option>
                  <option value="mxn">MXN</option>
                </select>
                <p className="text-xs text-slate-400">
                  {t('stripe_price_currency_hint') || 'La moneda por defecto es EUR.'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price-type">{t('stripe_price_type_label') || 'Tipo de cobro'}</Label>
                <select
                  id="price-type"
                  value={type}
                  onChange={(event) => setType(event.target.value as 'one_time' | 'recurring')}
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <option value="one_time">{t('stripe_price_type_one_time') || 'Pago único'}</option>
                  <option value="recurring">{t('stripe_price_type_recurring') || 'Recurrente'}</option>
                </select>
                <p className="text-xs text-slate-400">
                  {t('stripe_price_type_hint') || 'Una vez creado el precio, solo podrás activar o desactivar su disponibilidad.'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price-interval">{t('stripe_price_interval_label') || 'Intervalo'}</Label>
                <select
                  id="price-interval"
                  value={interval}
                  onChange={(event) => setInterval(event.target.value as 'day' | 'week' | 'month' | 'year')}
                  disabled={type !== 'recurring'}
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="month">{t('stripe_price_interval_month') || 'Mensual'}</option>
                  <option value="year">{t('stripe_price_interval_year') || 'Anual'}</option>
                  <option value="week">{t('stripe_price_interval_week') || 'Semanal'}</option>
                  <option value="day">{t('stripe_price_interval_day') || 'Diario'}</option>
                </select>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-slate-300 hover:text-white">
                {t('stripe_modal_close') || 'Cerrar'}
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-500 text-white hover:bg-emerald-500/90">
                {loading ? (t('procesando') || 'Procesando...') : (t('stripe_create_price_action') || 'Crear precio')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
