#!/usr/bin/env tsx
/**
 * Parte cada `src/i18n/messages/{locale}.json` en núcleo + bloques lazy.
 * Uso: pnpm i18n:split
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { SUPPORTED_LOCALES } from '../src/i18n/config';
import { splitLocaleMessages } from '../src/i18n/chunks';

const MESSAGES_DIR = join(process.cwd(), 'src/i18n/messages');

function sortTopLevelKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort((a, b) => a.localeCompare(b, 'es'))) {
    sorted[key] = obj[key];
  }
  return sorted;
}

function writeJson(path: string, data: Record<string, unknown>) {
  writeFileSync(path, `${JSON.stringify(sortTopLevelKeys(data), null, 2)}\n`, 'utf8');
}

for (const locale of SUPPORTED_LOCALES) {
  const monolithPath = join(MESSAGES_DIR, `${locale}.json`);
  if (!existsSync(monolithPath)) {
    console.error(`Falta ${monolithPath}`);
    process.exit(1);
  }
  const full = JSON.parse(readFileSync(monolithPath, 'utf8')) as Record<string, unknown>;
  const { core, chunks } = splitLocaleMessages(full);
  const localeDir = join(MESSAGES_DIR, locale);
  const chunksDir = join(localeDir, 'chunks');
  mkdirSync(chunksDir, { recursive: true });
  writeJson(join(localeDir, 'core.json'), core);
  writeJson(join(chunksDir, 'legal.json'), chunks.legal);
  writeJson(join(chunksDir, 'admin.json'), chunks.admin);
  console.log(
    `${locale}: core ${Object.keys(core).length} keys, legal ${Object.keys(chunks.legal).length}, admin ${Object.keys(chunks.admin).length}`
  );
}

console.log('Listo. Los .json monolíticos en messages/ se mantienen como referencia hasta el siguiente i18n:sync.');
