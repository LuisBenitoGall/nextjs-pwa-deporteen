/**
 * Xera src/i18n/messages/gl.json desde es.json e o mapa español→galego gl-string-map.json.
 * Se engaden cadeas novas en es.json, engádeas ao mapa e executa: node scripts/build-gl-from-es.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const es = JSON.parse(readFileSync(join(root, 'src/i18n/messages/es.json'), 'utf8'));
const T = JSON.parse(readFileSync(join(__dirname, 'gl-string-map.json'), 'utf8'));

function mapVal(s) {
  if (Object.prototype.hasOwnProperty.call(T, s)) return T[s];
  throw new Error(`Falta tradución GL para: ${JSON.stringify(s).slice(0, 120)}`);
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

writeFileSync(join(root, 'src/i18n/messages/gl.json'), JSON.stringify(walk(es), null, 2) + '\n', 'utf8');
console.log('gl.json xerado');
