import { afterEach, describe, expect, it, vi } from 'vitest';
import { isIosDevice, isIosUserAgent } from './isIosDevice';

describe('isIosUserAgent', () => {
  it('marca iPhone, iPad e iPod', () => {
    expect(isIosUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
    expect(isIosUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe(true);
    expect(isIosUserAgent('Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)')).toBe(true);
  });

  it('no marca Android, escritorio ni un iPad en modo escritorio', () => {
    expect(isIosUserAgent('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36')).toBe(false);
    expect(isIosUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
    expect(isIosUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false);
    expect(isIosUserAgent('')).toBe(false);
  });
});

describe('isIosDevice', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('devuelve false si no hay navigator', () => {
    vi.stubGlobal('navigator', undefined);
    expect(isIosDevice()).toBe(false);
  });

  it('usa el user agent del navegador', () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    );
    expect(isIosDevice()).toBe(true);
  });

  it('devuelve false en un user agent de escritorio o vacío', () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    );
    expect(isIosDevice()).toBe(false);

    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('');
    expect(isIosDevice()).toBe(false);
  });
});
