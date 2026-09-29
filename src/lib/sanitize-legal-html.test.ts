import { describe, it, expect } from 'vitest';
import { sanitizeLegalHtml } from './sanitize-legal-html';

describe('sanitizeLegalHtml', () => {
  it('keeps allowed legal markup', () => {
    const raw =
      '<p>Hola</p><ul><li><b>24 meses</b></li></ul><a href="/billing/renew">Renovar</a>';
    const out = sanitizeLegalHtml(raw);
    expect(out).toContain('24 meses');
    expect(out).toContain('href="/billing/renew"');
    expect(out).not.toContain('script');
  });

  it('strips script tags', () => {
    const out = sanitizeLegalHtml('<p>ok</p><script>alert(1)</script>');
    expect(out).toBe('<p>ok</p>');
  });
});
