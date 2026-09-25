import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import es from '../messages/es.json';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flattenKeys(v as Record<string, unknown>, key));
    } else {
      out.push(key);
    }
  }
  return out;
}

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === '.next') continue;
    const st = statSync(full);
    if (st.isDirectory()) walkTsFiles(full, acc);
    else if (/\.(tsx?)$/.test(entry) && !entry.includes('.test.')) acc.push(full);
  }
  return acc;
}

const KEY_RE = /\bt\(\s*['"`]([a-z0-9_]+(?:\.[a-z0-9_]+)*)['"`]/gi;

function collectUsedKeys(): Set<string> {
  const used = new Set<string>();
  for (const file of walkTsFiles(join(process.cwd(), 'src'))) {
    const src = readFileSync(file, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = KEY_RE.exec(src))) used.add(m[1]);
  }
  return used;
}

describe('i18n message keys used in code', () => {
  const dictKeys = new Set(flattenKeys(es as Record<string, unknown>));

  it('every t("key") in src exists in es.json', () => {
    const used = collectUsedKeys();
    const missing = [...used].filter((k) => !dictKeys.has(k)).sort();
    expect(missing, `Missing keys in es.json: ${missing.join(', ')}`).toEqual([]);
  });
});
