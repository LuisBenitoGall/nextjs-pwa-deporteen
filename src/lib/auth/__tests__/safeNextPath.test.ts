import { describe, it, expect } from 'vitest';
import { safeNextPath } from '../safeNextPath';

describe('safeNextPath', () => {
  it('allows internal paths', () => {
    expect(safeNextPath('/dashboard')).toBe('/dashboard');
    expect(safeNextPath('/players/new?x=1')).toBe('/players/new?x=1');
  });

  it('rejects external and protocol-relative URLs', () => {
    expect(safeNextPath('https://evil.com')).toBe('/dashboard');
    expect(safeNextPath('//evil.com')).toBe('/dashboard');
    expect(safeNextPath('javascript:alert(1)')).toBe('/dashboard');
  });

  it('falls back when empty', () => {
    expect(safeNextPath(null)).toBe('/dashboard');
    expect(safeNextPath('')).toBe('/dashboard');
  });
});
