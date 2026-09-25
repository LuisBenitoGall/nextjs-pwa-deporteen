'use client';

import Link from 'next/link';
import { useT } from '@/i18n/I18nProvider';
import TitleH1 from '@/components/TitleH1';

export default function CheckEmailPage() {
  const t = useT();

  return (
    <main className="max-w-md mx-auto p-6 text-center space-y-4">
      <TitleH1>{t('auth_check_email_title')}</TitleH1>
      <p className="text-gray-700">{t('auth_check_email_body')}</p>
      <div className="flex flex-col gap-2 items-center pt-2">
        <Link href="/login" className="underline font-medium text-green-700">
          {t('auth_check_email_login')}
        </Link>
        <Link href="/" className="text-sm text-gray-600 underline">
          {t('volver_inicio') || 'Volver al inicio'}
        </Link>
      </div>
    </main>
  );
}
