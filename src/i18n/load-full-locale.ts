import { readFileSync } from 'fs';
import { join } from 'path';
import type { Locale } from './config';
import { I18N_LAZY_CHUNKS, mergeLocaleMessages, type I18nLazyChunk } from './chunks';

const MESSAGES_DIR = join(process.cwd(), 'src/i18n/messages');

/** Carga el diccionario completo de un locale desde núcleo + bloques (tests y sync). */
export function loadFullLocaleMessages(locale: Locale): Record<string, unknown> {
  const core = JSON.parse(
    readFileSync(join(MESSAGES_DIR, locale, 'core.json'), 'utf8')
  ) as Record<string, unknown>;
  const chunks: Partial<Record<I18nLazyChunk, Record<string, unknown>>> = {};
  for (const chunk of I18N_LAZY_CHUNKS) {
    chunks[chunk] = JSON.parse(
      readFileSync(join(MESSAGES_DIR, locale, 'chunks', `${chunk}.json`), 'utf8')
    ) as Record<string, unknown>;
  }
  return mergeLocaleMessages(core, chunks);
}
