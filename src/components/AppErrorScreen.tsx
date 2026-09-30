'use client';

import Link from 'next/link';
import { useT } from '@/i18n/I18nProvider';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
  homeLabelKey?: string;
};

export default function AppErrorScreen({
  error,
  reset,
  homeHref = '/',
  homeLabelKey = 'volver_inicio',
}: Props) {
  const t = useT();

  return (
    <div className="mx-auto max-w-md space-y-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900">
        {t('error_unexpected_title') || 'Algo salió mal'}
      </h1>
      <p className="text-sm text-gray-600">
        {t('error_unexpected_body') ||
          'Ha ocurrido un error inesperado. Puedes reintentar o volver al inicio.'}
      </p>
      {process.env.NODE_ENV !== 'production' && error.message ? (
        <p className="text-xs text-gray-400 break-all">{error.message}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          {t('reintentar') || 'Reintentar'}
        </button>
        <Link
          href={homeHref}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t(homeLabelKey) || 'Volver al inicio'}
        </Link>
      </div>
    </div>
  );
}
