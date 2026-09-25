import { describe, it, expect } from 'vitest';
import { safeNext } from '../safe-next';

describe('safeNext', () => {
  it('allows internal paths', () => {
    expect(safeNext('/subscription')).toBe('/subscription');
    expect(safeNext('/players/new?via=code')).toBe('/players/new?via=code');
  });

  it('rejects external URLs', () => {
    expect(safeNext('https://evil.test/x')).toBe('/dashboard');
    expect(safeNext('//evil.test')).toBe('/dashboard');
  });

  it('uses fallback when empty', () => {
    expect(safeNext(null)).toBe('/dashboard');
    expect(safeNext('  ')).toBe('/dashboard');
  });
});
