import { cookies } from 'next/headers';
import { I18nSubProvider } from '@/i18n/I18nSubProvider';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  normalizeToAppLocale,
  type Locale,
} from '@/i18n/config';
import { importLazyChunk } from '@/i18n/chunks';

async function requestLocale(): Promise<Locale> {
  const jar = await cookies();
  return normalizeToAppLocale(jar.get(LOCALE_COOKIE_NAME)?.value ?? undefined) ?? DEFAULT_LOCALE;
}

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const locale = await requestLocale();
  const legal = await importLazyChunk(locale, 'legal');
  return <I18nSubProvider merge={legal}>{children}</I18nSubProvider>;
}
