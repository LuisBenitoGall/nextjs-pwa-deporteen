#!/usr/bin/env node
/**
 * Comprueba que cada locale tiene la misma forma de claves que es.json (valores ignorados).
 * Uso: node scripts/verify-i18n-parity.mjs
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const MESSAGES = join(process.cwd(), 'src/i18n/messages');
const LOCALES = ['ca', 'en', 'it', 'eu', 'gl'];

function shape(obj) {
  if (obj === null || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) return obj.map((item) => shape(item));
  const out = {};
  for (const k of Object.keys(obj).sort()) {
    out[k] = shape(obj[k]);
  }
  return out;
}

function main() {
  const base = JSON.parse(readFileSync(join(MESSAGES, 'es.json'), 'utf8'));
  const baseShape = JSON.stringify(shape(base));
  let ok = true;
  for (const loc of LOCALES) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(MESSAGES, `${loc}.json`), 'utf8'));
    } catch (e) {
      console.error(`✗ ${loc}.json: no se pudo leer`, e.message);
      ok = false;
      continue;
    }
    const s = JSON.stringify(shape(data));
    if (s !== baseShape) {
      console.error(`✗ ${loc}.json: la jerarquía de claves no coincide con es.json`);
      ok = false;
    } else {
      console.log(`✓ ${loc}.json`);
    }
  }
  process.exit(ok ? 0 : 1);
}

main();
