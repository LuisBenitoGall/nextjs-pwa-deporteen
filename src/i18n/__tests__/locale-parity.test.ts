import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../config';

const MESSAGES_DIR = join(process.cwd(), 'src/i18n/messages');

/**
 * Aplana el diccionario a pares clave→valor. Los elementos de array llevan índice
 * (`legal.privacy.sections[3].html`) para que la comparación cubra los textos legales.
 */
function flatten(value: unknown, prefix = '', out = new Map<string, unknown>()) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => flatten(item, `${prefix}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else {
    out.set(prefix, value);
  }
  return out;
}

const PLACEHOLDER_RE = /\{([A-Za-z0-9_.\-]+)\}/g;

/** Marcadores simples ordenados; ignora los {{...}} de los textos legales. */
function placeholders(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  const stripped = value.replace(/\{\{[^}]*\}\}/g, '');
  return [...stripped.matchAll(PLACEHOLDER_RE)].map(m => m[1]).sort();
}

function load(locale: string) {
  return flatten(JSON.parse(readFileSync(join(MESSAGES_DIR, `${locale}.json`), 'utf8')));
}

const base = load(DEFAULT_LOCALE);
const targets = SUPPORTED_LOCALES.filter(l => l !== DEFAULT_LOCALE);

describe(`paridad de locales contra ${DEFAULT_LOCALE}.json`, () => {
  it.each(targets)('%s no pierde ninguna clave', locale => {
    const dict = load(locale);
    const missing = [...base.keys()].filter(k => !dict.has(k)).sort();
    expect(missing, `Claves ausentes en ${locale}.json: ${missing.join(', ')}`).toEqual([]);
  });

  it.each(targets)('%s no añade claves que no existan en la base', locale => {
    const dict = load(locale);
    const extra = [...dict.keys()].filter(k => !base.has(k)).sort();
    expect(extra, `Claves sobrantes en ${locale}.json: ${extra.join(', ')}`).toEqual([]);
  });

  it.each(targets)('%s no deja ningún valor vacío', locale => {
    const empty = [...load(locale)]
      .filter(([, v]) => typeof v === 'string' && !v.trim())
      .map(([k]) => k)
      .sort();
    expect(empty, `Valores vacíos en ${locale}.json: ${empty.join(', ')}`).toEqual([]);
  });

  it.each(targets)('%s conserva los mismos marcadores que la base', locale => {
    const dict = load(locale);
    const mismatched: string[] = [];
    for (const [key, value] of base) {
      if (!dict.has(key)) continue;
      const expected = placeholders(value).join(',');
      const actual = placeholders(dict.get(key)).join(',');
      if (expected !== actual) mismatched.push(`${key} (${DEFAULT_LOCALE}: ${expected || '—'} / ${locale}: ${actual || '—'})`);
    }
    expect(mismatched, `Marcadores descuadrados en ${locale}.json: ${mismatched.join('; ')}`).toEqual([]);
  });
});
