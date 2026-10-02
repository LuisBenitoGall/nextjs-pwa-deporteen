import { describe, it, expect } from 'vitest';
import { dateAtInputToIso, parseDateAtInput } from './parseDateAtInput';

describe('parseDateAtInput', () => {
  it('parses datetime-local', () => {
    const d = parseDateAtInput('2026-10-02T15:21');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(9);
    expect(d!.getDate()).toBe(2);
    expect(d!.getHours()).toBe(15);
    expect(d!.getMinutes()).toBe(21);
  });

  it('parses ES mobile-style date', () => {
    const d = parseDateAtInput('02/10/2026, 15:21');
    expect(d).not.toBeNull();
    expect(d!.getDate()).toBe(2);
    expect(d!.getMonth()).toBe(9);
    expect(d!.getHours()).toBe(15);
    expect(d!.getMinutes()).toBe(21);
  });

  it('returns null for empty or invalid', () => {
    expect(parseDateAtInput('')).toBeNull();
    expect(parseDateAtInput('   ')).toBeNull();
    expect(parseDateAtInput('no-es-fecha')).toBeNull();
  });

  it('dateAtInputToIso avoids throwing on bad input', () => {
    expect(dateAtInputToIso('')).toBeNull();
    expect(dateAtInputToIso('02/10/2026, 15:21')).toMatch(/2026-10-02/);
  });
});
