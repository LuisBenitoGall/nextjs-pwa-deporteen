'use client';
import { useLocale } from '@/i18n/I18nProvider';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  const languages = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
    { code: 'ca', label: 'Català' }
  ];

  return (
    <div className="mt-8 flex justify-center gap-3">
      {languages.map(({ code, label, disabled }) => (
        <button
          key={code}
          onClick={() => !disabled && setLocale(code as any)}
          disabled={disabled || locale === code}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            locale === code
              ? 'bg-blue-600 text-white'
              : disabled
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
