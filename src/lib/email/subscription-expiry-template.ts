import { normalizeToAppLocale, type Locale, DEFAULT_LOCALE, intlLocaleTag } from '@/i18n/config';
import es from '@/i18n/messages/es.json';
import en from '@/i18n/messages/en.json';
import ca from '@/i18n/messages/ca.json';
import it from '@/i18n/messages/it.json';
import pt from '@/i18n/messages/pt.json';
import eu from '@/i18n/messages/eu.json';
import gl from '@/i18n/messages/gl.json';

type FlatMessages = Record<string, string>;

const MESSAGES: Record<Locale, FlatMessages> = {
  es: es as unknown as FlatMessages,
  en: en as unknown as FlatMessages,
  ca: ca as unknown as FlatMessages,
  it: it as unknown as FlatMessages,
  pt: pt as unknown as FlatMessages,
  eu: eu as unknown as FlatMessages,
  gl: gl as unknown as FlatMessages,
};

function t(locale: Locale, key: string): string {
  return MESSAGES[locale][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
}

function replacePlaceholders(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

export type BuildExpiryEmailInput = {
  locale: string | null | undefined;
  recipientName: string | null;
  daysLeft: number;
  endDate: Date;
  renewUrl: string;
};

export function resolveEmailLocale(raw: string | null | undefined): Locale {
  return normalizeToAppLocale(raw) ?? DEFAULT_LOCALE;
}

export function buildSubscriptionExpiryEmail(input: BuildExpiryEmailInput): {
  subject: string;
  html: string;
} {
  const locale = resolveEmailLocale(input.locale);
  const intlTag = intlLocaleTag(locale);
  const dateFormatted = input.endDate.toLocaleDateString(intlTag, { dateStyle: 'long' });
  const greetingName = input.recipientName?.trim() ? ` ${input.recipientName.trim()}` : '';

  const subject = replacePlaceholders(t(locale, 'email_suscripcion_caducidad_asunto'), {
    DAYS: input.daysLeft,
  });

  const body = replacePlaceholders(t(locale, 'email_suscripcion_caducidad_cuerpo'), {
    NAME: greetingName,
    DAYS: input.daysLeft,
    DATE: dateFormatted,
    RENEW_URL: input.renewUrl,
  });

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;">
      ${body}
    </div>
  `.trim();

  return { subject, html };
}
