'use client';

import { useState, FormEvent } from 'react';
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

export default function CreateProductForm() {
  const t = useT();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createPrice, setCreatePrice] = useState(false);
  const [priceAmount, setPriceAmount] = useState('');
  const [priceCurrency, setPriceCurrency] = useState('eur');
  const [days, setDays] = useState('');
  const [free, setFree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t('stripe_error_name_required') || 'El nombre es obligatorio.');
      return;
    }

    if (createPrice) {
      const parsedAmount = Number(priceAmount.replace(',', '.'));
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setError(t('stripe_price_error_amount_required') || 'Introduce un importe válido.');
        return;
      }
      const parsedDays = Number(days);
      if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
        setError('Introduce un número de días válido (> 0).');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/stripe/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          createPrice,
          priceAmount: createPrice ? Number(priceAmount.replace(',', '.')) : undefined,
          priceCurrency: createPrice ? priceCurrency : undefined,
          days: createPrice ? Number(days) : undefined,
          free: createPrice ? free : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Stripe error');
      }

      setName('');
      setDescription('');
      setCreatePrice(false);
      setPriceAmount('');
      setPriceCurrency('eur');
      setDays('');
      setFree(false);
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
        <Button variant="default" size="lg" className="bg-emerald-500 text-white hover:bg-emerald-500/90">
          {t('stripe_add_product_button') || 'Agregar producto'}
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle>{t('stripe_product_modal_title') || 'Nuevo producto'}</DialogTitle>
          <DialogDescription>
            {t('stripe_product_modal_subtitle') || 'Define un nombre, una descripción y, si lo necesitas, un precio inicial.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">{t('nombre') || 'Nombre'}</Label>
              <Input
                id="product-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('stripe_product_name_placeholder') || 'Producto premium'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-description">{t('descripcion') || 'Descripción'}</Label>
              <textarea
                id="product-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="flex w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                placeholder={t('stripe_product_description_placeholder') || 'Describe el producto para tus clientes.'}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {t('stripe_product_create_price_toggle') || 'Crear precio por defecto'}
                </p>
                <p className="text-xs text-slate-400">
                  {t('stripe_product_create_price_help') || 'Si está activo, se generará automáticamente un precio por defecto en Stripe.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={createPrice}
                onClick={() => setCreatePrice((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${createPrice ? 'bg-emerald-500' : 'bg-slate-600'}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${createPrice ? 'translate-x-5' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {createPrice && (
              <div className="grid gap-4 sm:grid-cols-[1fr,160px]">
                <div className="space-y-2">
                  <Label htmlFor="product-price">{t('stripe_product_price_label') || 'Precio inicial'}</Label>
                  <Input
                    id="product-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceAmount}
                    onChange={(event) => setPriceAmount(event.target.value)}
                    placeholder={t('stripe_product_price_placeholder') || '19.99'}
                  />
                  <p className="text-xs text-slate-400">
                    {t('stripe_product_price_hint') || 'Introduce el importe en la moneda seleccionada; lo convertiremos automáticamente a céntimos.'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-currency">{t('stripe_product_currency_label') || 'Moneda'}</Label>
                  <select
                    id="product-currency"
                    value={priceCurrency}
                    onChange={(event) => setPriceCurrency(event.target.value.toLowerCase())}
                    className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <option value="eur">EUR</option>
                    <option value="usd">USD</option>
                    <option value="gbp">GBP</option>
                    <option value="mxn">MXN</option>
                  </select>
                  <p className="text-xs text-slate-400">
                    {t('stripe_product_currency_hint') || 'Moneda por defecto: EUR.'}
                  </p>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="product-days">Duración en días</Label>
                  <Input
                    id="product-days"
                    type="number"
                    min="1"
                    step="1"
                    value={days}
                    onChange={(event) => setDays(event.target.value)}
                    placeholder="365"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      id="product-free"
                      type="checkbox"
                      checked={free}
                      onChange={(e) => setFree(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-950/60"
                    />
                    <Label htmlFor="product-free">Plan gratuito (oculto para códigos)</Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-slate-300 hover:text-white">
              {t('stripe_modal_close') || 'Cerrar'}
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-500 text-white hover:bg-emerald-500/90">
              {loading ? (t('procesando') || 'Procesando...') : (t('stripe_create_product_action') || 'Crear producto')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
