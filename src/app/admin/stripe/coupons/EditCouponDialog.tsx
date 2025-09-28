'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';
import { useToast } from '@/components/ui/toast';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { CouponRow } from './CouponsTable';

interface EditCouponDialogProps {
  coupon: CouponRow;
  onSuccess?: () => void;
}

export default function EditCouponDialog({ coupon, onSuccess }: EditCouponDialogProps) {
  const t = useT();
  const router = useRouter();
  const { showToast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(coupon.name ?? '');
  const [redeemBy, setRedeemBy] = useState<string | null>(coupon.redeemByRaw);
  const [maxRedemptions, setMaxRedemptions] = useState<string>(
    coupon.maxRedemptionsRaw != null ? String(coupon.maxRedemptionsRaw) : '',
  );
  const [metadata, setMetadata] = useState<string>(
    coupon.metadata ? JSON.stringify(coupon.metadata, null, 2) : '',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(coupon.name ?? '');
      setRedeemBy(coupon.redeemByRaw);
      setMaxRedemptions(coupon.maxRedemptionsRaw != null ? String(coupon.maxRedemptionsRaw) : '');
      setMetadata(coupon.metadata ? JSON.stringify(coupon.metadata, null, 2) : '');
      setError(null);
    }
  }, [open, coupon]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        couponId: coupon.id,
        name: name.trim() || null,
        redeemBy: redeemBy ? new Date(`${redeemBy}T00:00:00Z`).toISOString() : null,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
        metadata: metadata.trim() ? metadata : null,
      };

      const response = await fetch('/api/admin/stripe/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Stripe error');
      }

      showToast({
        title: t('stripe_coupons_edit_success') || 'Cupón actualizado correctamente.',
        variant: 'success',
      });

      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err: any) {
      setError(err?.message || t('stripe_coupons_edit_error') || 'No se pudo actualizar el cupón.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t('stripe_coupons_edit_open') || 'Editar'}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle>{t('stripe_coupons_edit_title') || 'Editar cupón'}</DialogTitle>
          <DialogDescription>
            {t('stripe_coupons_description') || 'Administra los códigos de descuento disponibles en Stripe.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`coupon-name-${coupon.id}`}>{t('stripe_coupons_edit_name') || 'Nombre'}</Label>
            <Input
              id={`coupon-name-${coupon.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={coupon.name ?? 'Campaña' }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`coupon-redeem-${coupon.id}`}>{t('stripe_coupons_edit_redeem_by') || 'Válido hasta'}</Label>
              <Input
                id={`coupon-redeem-${coupon.id}`}
                type="date"
                value={redeemBy ?? ''}
                onChange={(event) => setRedeemBy(event.target.value || null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`coupon-max-${coupon.id}`}>{t('stripe_coupons_edit_max_redemptions') || 'Límite de canjes'}</Label>
              <Input
                id={`coupon-max-${coupon.id}`}
                type="number"
                min="1"
                step="1"
                value={maxRedemptions}
                onChange={(event) => setMaxRedemptions(event.target.value)}
                placeholder="100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`coupon-metadata-${coupon.id}`}>{t('stripe_coupons_edit_metadata') || 'Metadatos (JSON opcional)'}</Label>
            <textarea
              id={`coupon-metadata-${coupon.id}`}
              value={metadata}
              onChange={(event) => setMetadata(event.target.value)}
              rows={4}
              className="flex w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              placeholder={t('stripe_coupons_edit_metadata_hint') || 'Introduce un objeto JSON con pares clave-valor.'}
            />
            <p className="text-xs text-slate-400">{t('stripe_coupons_edit_metadata_hint') || 'Introduce un objeto JSON con pares clave-valor.'}</p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-slate-300 hover:text-white"
            >
              {t('stripe_coupons_edit_cancel') || t('stripe_modal_close') || 'Cancelar'}
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-500 text-white hover:bg-emerald-500/90">
              {loading ? (t('procesando') || 'Procesando...') : (t('stripe_coupons_edit_submit') || 'Guardar cambios')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
