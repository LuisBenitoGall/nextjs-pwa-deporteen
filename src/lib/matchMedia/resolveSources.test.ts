import { describe, expect, it } from 'vitest';
import { isSupabaseStoragePath } from './resolveSources';

describe('isSupabaseStoragePath', () => {
  it('detecta rutas de bucket matches', () => {
    expect(isSupabaseStoragePath('user/abc/photo.jpg')).toBe(true);
  });

  it('excluye prefijos r2 y drive', () => {
    expect(isSupabaseStoragePath('r2:user/x.jpg')).toBe(false);
    expect(isSupabaseStoragePath('drive:fileId')).toBe(false);
    expect(isSupabaseStoragePath(null)).toBe(false);
  });
});
