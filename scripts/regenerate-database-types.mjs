#!/usr/bin/env node
/**
 * Regenera src/lib/database.types.ts desde el proyecto Supabase remoto.
 *
 * Requiere:
 *   SUPABASE_ACCESS_TOKEN — token con lectura de proyecto
 *   SUPABASE_PROJECT_REF   — ref del proyecto (o pásalo como primer argumento)
 *
 * Opcional: SUPABASE_DB_URL no es necesario para este flujo (usa Management API).
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRef = process.argv[2] || process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!projectRef) {
  console.error('Falta SUPABASE_PROJECT_REF o argumento <project-ref>.');
  process.exit(1);
}
if (!token) {
  console.error('Falta SUPABASE_ACCESS_TOKEN.');
  process.exit(1);
}

const outPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'lib',
  'database.types.ts',
);

const header = `/**
 * Tipos generados desde el proyecto Supabase real.
 * Regenerar: \`pnpm db:types:generate\` (requiere \`SUPABASE_ACCESS_TOKEN\` y \`SUPABASE_PROJECT_REF\`).
 * Comprobar desfase: \`pnpm db:types:check\`.
 */
`;

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

writeFileSync(outPath, header + result.stdout, 'utf8');
console.log(`Escrito ${outPath} (${result.stdout.split('\n').length} líneas)`);
