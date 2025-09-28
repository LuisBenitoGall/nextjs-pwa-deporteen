'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';
import { useToast } from '@/components/ui/toast';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CreateCouponForm() {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amountOff, setAmountOff] = useState('');
  const [percentOff, setPercentOff] = useState('');
  const [currency, setCurrency] = useState('eur');
  const [duration, setDuration] = useState('once');
  const [durationInMonths, setDurationInMonths] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [redeemBy, setRedeemBy] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const currencyOptions = ['eur', 'usd', 'gbp'];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const parsedAmountOff = amountOff.trim() === '' ? undefined : Number(amountOff);
      const parsedPercentOff = percentOff.trim() === '' ? undefined : Number(percentOff);
      const parsedDurationInMonths = durationInMonths.trim() === '' ? null : Number(durationInMonths);
      const parsedMaxRedemptions = maxRedemptions.trim() === '' ? null : Number(maxRedemptions);

      const payload = {
        name,
        description: description.trim() ? description : undefined,
        amount_off: parsedAmountOff && !Number.isNaN(parsedAmountOff) ? parsedAmountOff : undefined,
        percent_off: parsedPercentOff && !Number.isNaN(parsedPercentOff) ? parsedPercentOff : undefined,
        currency: parsedAmountOff ? currency : undefined,
        duration,
        duration_in_months:
          duration === 'repeating' && parsedDurationInMonths && !Number.isNaN(parsedDurationInMonths)
            ? parsedDurationInMonths
            : undefined,
        max_redemptions:
          parsedMaxRedemptions && !Number.isNaN(parsedMaxRedemptions) ? parsedMaxRedemptions : undefined,
        redeem_by: redeemBy ? redeemBy.toISOString() : undefined,
      };

      const response = await fetch('/api/stripe/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setName('');
      setDescription('');
      setAmountOff('');
      setPercentOff('');
      setCurrency('eur');
      setDuration('once');
      setDurationInMonths('');
      setMaxRedemptions('');
      setRedeemBy(null);
      toast.showToast({
        title: t('stripe_coupons_create_success') || 'Cupón creado con éxito',
        description: t('stripe_coupons_create_success_description') || 'El cupón ha sido creado con éxito.',
        variant: 'success',
      });

      setOpen(false);
      router.push('/admin/stripe/coupons');
    } catch (error: any) {
      toast.showToast({
        title: t('stripe_coupons_create_error') || 'Error al crear cupón',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-emerald-500 hover:text-emerald-500/90">
          {t('stripe_coupons_create') || 'Crear cupón'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-6">
        <DialogTitle>{t('stripe_coupons_create') || 'Crear cupón'}</DialogTitle>
        <DialogDescription>
          {t('stripe_coupons_create_dialog_description') || 'Crear un nuevo cupón para tus clientes'}
        </DialogDescription>
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="coupon-name" className="text-right">
                {t('stripe_coupons_create_name') || 'Nombre'}
              </Label>
              <Input
                id="coupon-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="coupon-description" className="text-right">
                {t('stripe_coupons_create_coupon_description') || 'Descripción'}
              </Label>
              <Input
                id="coupon-description"
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="coupon-amount-off" className="text-right">
                {t('stripe_coupons_create_amount_off') || 'Monto de descuento'}
              </Label>
              <Input
                id="coupon-amount-off"
                type="number"
                min="0"
                step="0.01"
                value={amountOff}
                onChange={(event) => setAmountOff(event.target.value)}
                className="col-span-3"
                disabled={percentOff.trim() !== '' && Number(percentOff) > 0}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="coupon-percent-off" className="text-right">
                {t('stripe_coupons_create_percent_off') || 'Porcentaje de descuento'}
              </Label>
              <Input
                id="coupon-percent-off"
                type="number"
                min="0"
                max="100"
                step="1"
                value={percentOff}
                onChange={(event) => setPercentOff(event.target.value)}
                className="col-span-3"
                disabled={amountOff.trim() !== '' && Number(amountOff) > 0}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="coupon-currency" className="text-right">
                {t('stripe_coupons_create_currency') || 'Moneda'}
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t('stripe_coupons_create_currency_placeholder') || 'Selecciona una moneda'} />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="coupon-duration" className="text-right">
                {t('stripe_coupons_create_duration') || 'Duración'}
              </Label>
              <Select onValueChange={setDuration} value={duration}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t('stripe_coupons_create_duration') || 'Duración'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">{t('stripe_coupons_duration_once') || 'Un solo uso'}</SelectItem>
                  <SelectItem value="forever">{t('stripe_coupons_duration_forever') || 'Para siempre'}</SelectItem>
                  <SelectItem value="repeating">{t('stripe_coupons_create_duration_repeating_option') || 'Recurrente (especifica meses)'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {duration === 'repeating' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="coupon-duration-in-months" className="text-right">
                  {t('stripe_coupons_create_duration_in_months') || 'Duración en meses'}
                </Label>
                <Input
                  id="coupon-duration-in-months"
                  type="number"
                  min="1"
                  step="1"
                  value={durationInMonths}
                  onChange={(event) => setDurationInMonths(event.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="coupon-max-redemptions" className="text-right">
                {t('stripe_coupons_create_max_redemptions') || 'Límite de canjes'}
              </Label>
              <Input
                id="coupon-max-redemptions"
                type="number"
                min="1"
                step="1"
                value={maxRedemptions}
                onChange={(event) => setMaxRedemptions(event.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="coupon-redeem-by" className="text-right">
                {t('stripe_coupons_create_redeem_by') || 'Válido hasta'}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal col-span-3",
                      !redeemBy && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {redeemBy ? format(redeemBy, "PPP") : <span>{t('stripe_coupons_create_redeem_by') || 'Selecciona una fecha'}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={redeemBy || undefined}
                    onSelect={(date) => setRedeemBy(date || null)}
                    initialFocus
                    required={false}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-slate-300 hover:text-white">
              {t('stripe_coupons_create_cancel') || t('stripe_modal_close') || 'Cancelar'}
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-500 text-white hover:bg-emerald-500/90">
              {loading ? (t('procesando') || 'Procesando...') : (t('stripe_coupons_create_submit') || 'Crear cupón')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
