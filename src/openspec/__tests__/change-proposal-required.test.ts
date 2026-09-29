import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const CHANGES_DIR = join(process.cwd(), 'openspec/changes');

/**
 * Todo directorio activo en `openspec/changes/` (excepto `archive/`) debe tener
 * `proposal.md`; un `.openspec.yaml` solo es un contrato vacío.
 */
describe('OpenSpec changes activos', () => {
  it('cada change tiene proposal.md', () => {
    const missing: string[] = [];
    for (const name of readdirSync(CHANGES_DIR)) {
      if (name === 'archive' || name.startsWith('.')) continue;
      const dir = join(CHANGES_DIR, name);
      if (!statSync(dir).isDirectory()) continue;
      if (!existsSync(join(dir, 'proposal.md'))) {
        missing.push(name);
      }
    }
    expect(missing, `Changes sin proposal.md: ${missing.join(', ')}`).toEqual([]);
  });
});
