import { describe, expect, it } from 'vitest';
import { importLazyChunk } from '../chunks';

describe('importLazyChunk', () => {
  it('carga el bloque legal en español (imports estáticos)', async () => {
    const legal = await importLazyChunk('es', 'legal');
    const sections = (legal as { legal?: { privacy?: { sections?: unknown[] } } }).legal?.privacy
      ?.sections;
    expect(Array.isArray(sections)).toBe(true);
    expect(sections!.length).toBeGreaterThan(0);
  });
});
