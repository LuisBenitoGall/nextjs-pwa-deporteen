/**
 * Genera src/i18n/messages/it.json a partir de en.json y los mapas it-en2it-1/2/3.json
 * (chiavi: stringhe inglesi come in en.json; stessa forma di chiavi di es.json).
 * Uso: node scripts/build-it-from-en-map.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const messages = join(root, 'src/i18n/messages');

const es = JSON.parse(readFileSync(join(messages, 'es.json'), 'utf8'));
const en = JSON.parse(readFileSync(join(messages, 'en.json'), 'utf8'));

const T = {
  ...JSON.parse(readFileSync(join(__dirname, 'it-en2it-1.json'), 'utf8')),
  ...JSON.parse(readFileSync(join(__dirname, 'it-en2it-2.json'), 'utf8')),
  ...JSON.parse(readFileSync(join(__dirname, 'it-en2it-3.json'), 'utf8')),
};

function assertSameShape(a, b, path = '') {
  if (a === null || b === null) {
    if (a !== b) throw new Error(`Null mismatch at ${path}`);
    return;
  }
  const ta = typeof a;
  const tb = typeof b;
  if (ta !== tb) throw new Error(`Type mismatch at ${path}: ${ta} vs ${tb}`);
  if (ta === 'string') return;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) throw new Error(`Array mismatch at ${path}`);
    a.forEach((v, i) => assertSameShape(v, b[i], `${path}[${i}]`));
    return;
  }
  if (ta === 'object') {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.join(',') !== kb.join(',')) throw new Error(`Object keys mismatch at ${path}`);
    for (const k of ka) assertSameShape(a[k], b[k], path ? `${path}.${k}` : k);
  }
}

function mapVal(s) {
  if (Object.prototype.hasOwnProperty.call(T, s)) return T[s];
  throw new Error(`Falta traducción IT para EN: ${JSON.stringify(s).slice(0, 120)}`);
}

function walk(o) {
  if (typeof o === 'string') return mapVal(o);
  if (Array.isArray(o)) return o.map(walk);
  if (o && typeof o === 'object') {
    const out = {};
    for (const k of Object.keys(o)) out[k] = walk(o[k]);
    return out;
  }
  return o;
}

assertSameShape(es, en, 'root');
writeFileSync(join(messages, 'it.json'), JSON.stringify(walk(en), null, 2) + '\n', 'utf8');
console.log('it.json generado');
