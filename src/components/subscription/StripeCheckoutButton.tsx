'use client';

import { useState } from 'react';
import Submit from '@/components/Submit';

type Props = {
  planId: string;
  units?: number;
  label?: string;
  loadingLabel?: string;
  className?: string;
};

export default function StripeCheckoutButton({
  planId,
  units = 1,
  label,
  loadingLabel,
  className,
}: Props) {
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setError(null);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, units }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'No se pudo iniciar el pago');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Respuesta de checkout inválida');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de red');
    }
  }

  return (
    <div className={className}>
      <Submit onClick={startCheckout} text={label ?? 'Continuar'} loadingText={loadingLabel ?? label ?? 'Continuar'} />
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
