'use client';

import Link from 'next/link';
import { useT } from '@/i18n/I18nProvider';

type Props = {
  message?: string | null;
  titleKey?: string;
  backHref?: string;
  backLabelKey?: string;
};

export default function PageLoadError({
  message,
  titleKey = 'error_carga_titulo',
  backHref = '/dashboard',
  backLabelKey = 'mi_panel_volver',
}: Props) {
  const t = useT();

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-lg font-semibold text-gray-900">
        {t(titleKey) || 'No se pudo cargar'}
      </h1>
      {message ? (
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      ) : (
        <p className="mt-2 text-sm text-gray-600">
          {t('error_carga_mensaje') || 'Comprueba tu conexión o vuelve más tarde.'}
        </p>
      )}
      <div className="mt-4">
        <Link href={backHref} className="text-green-700 underline font-medium">
          {t(backLabelKey) || 'Volver'}
        </Link>
      </div>
    </div>
  );
}
