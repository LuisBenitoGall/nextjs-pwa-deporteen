import { describe, it, expect } from 'vitest';
import { isProtectedAppPath } from '../protectedRoutes';

describe('isProtectedAppPath', () => {
  it('includes matches and gallery', () => {
    expect(isProtectedAppPath('/matches/abc/live')).toBe(true);
    expect(isProtectedAppPath('/gallery')).toBe(true);
  });

  it('excludes public routes', () => {
    expect(isProtectedAppPath('/')).toBe(false);
    expect(isProtectedAppPath('/login')).toBe(false);
    expect(isProtectedAppPath('/legal/privacidad')).toBe(false);
  });
});
