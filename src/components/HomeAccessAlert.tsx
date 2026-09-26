'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';

function HomeAccessAlertInner() {
  const t = useT();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const notice = searchParams.get('notice');

  if (error === 'forbidden') {
    return (
      <div
        className="mx-auto max-w-3xl mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        role="alert"
      >
        {t('admin_access_forbidden') ||
          'No tienes permiso para acceder al panel de administración.'}
      </div>
    );
  }

  if (error === 'account_disabled' || notice === 'account_disabled') {
    return (
      <div
        className="mx-auto max-w-3xl mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        role="alert"
      >
        {t('account_disabled_notice') ||
          'Tu cuenta está desactivada. Contacta con soporte si crees que es un error.'}
      </div>
    );
  }

  return null;
}

export default function HomeAccessAlert() {
  return (
    <Suspense fallback={null}>
      <HomeAccessAlertInner />
    </Suspense>
  );
}
