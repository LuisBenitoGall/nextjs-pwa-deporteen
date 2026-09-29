import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { CORE_MESSAGES_MAX_BYTES_ES } from '../chunks';

describe('i18n núcleo (es)', () => {
  it('no supera el umbral de bytes acordado', () => {
    const path = join(process.cwd(), 'src/i18n/messages/es/core.json');
    const bytes = Buffer.byteLength(readFileSync(path, 'utf8'), 'utf8');
    expect(bytes).toBeLessThanOrEqual(CORE_MESSAGES_MAX_BYTES_ES);
  });
});
