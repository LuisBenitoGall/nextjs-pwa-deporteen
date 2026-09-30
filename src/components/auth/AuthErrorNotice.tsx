'use client';

import Link from 'next/link';
import { useT } from '@/i18n/I18nProvider';
import type { AuthErrorPresentation } from '@/lib/auth/authErrorPresentation';

type Props = {
  presentation: AuthErrorPresentation;
  className?: string;
};

export default function AuthErrorNotice({ presentation, className }: Props) {
  const t = useT();
  const text = t(presentation.messageKey) || presentation.messageFallback;

  return (
    <div
      className={
        className ??
        'mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 space-y-3'
      }
      role="alert"
    >
      <p>{text}</p>
      {presentation.ctas.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {presentation.ctas.map((cta) => (
            <Link
              key={`${cta.href}-${cta.labelKey}`}
              href={cta.href}
              className="font-medium text-green-700 underline hover:text-green-800"
            >
              {t(cta.labelKey) || cta.fallback}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
