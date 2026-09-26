'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';

const CODE_MESSAGES: Record<string, { okKey: string; errKey: string }> = {
  delete_competition: {
    okKey: 'competition_delete_ok',
    errKey: 'competition_delete_error',
  },
  delete_player: {
    okKey: 'player_delete_ok',
    errKey: 'player_delete_error',
  },
};

type Flash = { variant: 'success' | 'error'; text: string };

function ActionResultBannerInner() {
  const t = useT();
  const router = useRouter();
  const [flash, setFlash] = useState<Flash | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const okCode = params.get('actionOk');
    const errCode = params.get('actionError');

    if (errCode && CODE_MESSAGES[errCode]) {
      setFlash({
        variant: 'error',
        text: t(CODE_MESSAGES[errCode].errKey) || 'No se pudo completar la acción.',
      });
    } else if (okCode && CODE_MESSAGES[okCode]) {
      setFlash({
        variant: 'success',
        text: t(CODE_MESSAGES[okCode].okKey) || 'Acción completada.',
      });
    }

    if (okCode || errCode) {
      params.delete('actionOk');
      params.delete('actionError');
      const qs = params.toString();
      router.replace(`${window.location.pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    }
  }, [router, t]);

  if (!flash) return null;

  const styles =
    flash.variant === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-green-200 bg-green-50 text-green-800';

  return (
    <div className={`mb-4 rounded-xl border p-4 text-sm ${styles}`} role="status">
      {flash.text}
    </div>
  );
}

export default function ActionResultBanner() {
  return (
    <Suspense fallback={null}>
      <ActionResultBannerInner />
    </Suspense>
  );
}
