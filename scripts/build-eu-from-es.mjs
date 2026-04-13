/**
 * Genera src/i18n/messages/eu.json a partir de es.json y los mapas eu-trans-1/2/3.json
 * (gakoak: es.json-eko kate bakoitzaren itzulpena; es aldatzen bada, gehitu/edita mapak eta exekutatu).
 * Uso: node scripts/build-eu-from-es.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const es = JSON.parse(readFileSync(join(root, 'src/i18n/messages/es.json'), 'utf8'));

const T = {
  ...JSON.parse(readFileSync(join(__dirname, 'eu-trans-1.json'), 'utf8')),
  ...JSON.parse(readFileSync(join(__dirname, 'eu-trans-2.json'), 'utf8')),
  ...JSON.parse(readFileSync(join(__dirname, 'eu-trans-3.json'), 'utf8')),
};

function mapVal(s) {
  if (Object.prototype.hasOwnProperty.call(T, s)) return T[s];
  throw new Error(`Falta traducción EU para: ${JSON.stringify(s).slice(0, 120)}`);
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

writeFileSync(join(root, 'src/i18n/messages/eu.json'), JSON.stringify(walk(es), null, 2) + '\n', 'utf8');
console.log('eu.json generado');
