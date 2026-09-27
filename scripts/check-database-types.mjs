#!/usr/bin/env node
/**
 * Comprueba si database.types.ts está alineado con Supabase remoto.
 * Exit 0 = sin cambios; exit 1 = hay desfase (regenera con pnpm db:types:generate).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRef = process.argv[2] || process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!projectRef || !token) {
  console.error('Requiere SUPABASE_PROJECT_REF y SUPABASE_ACCESS_TOKEN.');
  process.exit(2);
}

const typesPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'lib',
  'database.types.ts',
);

const current = readFileSync(typesPath, 'utf8').replace(/^\/\*\*[\s\S]*?\*\/\n/, '');

const result = spawnSync(
  'npx',
  ['supabase', 'gen', 'types', 'typescript', '--project-id', projectRef],
  {
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  },
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || 'supabase gen types failed');
  process.exit(result.status ?? 1);
}

const fresh = result.stdout;
if (current !== fresh) {
  console.error(
    'database.types.ts está desfasado respecto al proyecto Supabase. Ejecuta: pnpm db:types:generate',
  );
  process.exit(1);
}

console.log('database.types.ts está alineado con Supabase.');
