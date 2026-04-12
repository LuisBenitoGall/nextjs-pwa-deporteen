import { describe, it, expect } from 'vitest'
import { isSupportedLocale, SUPPORTED_LOCALES, DEFAULT_LOCALE, LOCALE_LABELS } from '../config'

describe('isSupportedLocale', () => {
  it('accepts valid locales', () => {
    expect(isSupportedLocale('es')).toBe(true)
    expect(isSupportedLocale('en')).toBe(true)
    expect(isSupportedLocale('ca')).toBe(true)
    expect(isSupportedLocale('it')).toBe(true)
    expect(isSupportedLocale('eu')).toBe(true)
    expect(isSupportedLocale('gl')).toBe(true)
  })

  it('rejects unknown locales', () => {
    expect(isSupportedLocale('fr')).toBe(false)
    expect(isSupportedLocale('pt')).toBe(false)
    expect(isSupportedLocale('')).toBe(false)
  })

  it('rejects null and undefined', () => {
    expect(isSupportedLocale(null)).toBe(false)
    expect(isSupportedLocale(undefined)).toBe(false)
  })
})

describe('SUPPORTED_LOCALES', () => {
  it('contains exactly es, en, ca, it, eu, gl', () => {
    expect(SUPPORTED_LOCALES).toEqual(['es', 'en', 'ca', 'it', 'eu', 'gl'])
  })
})

describe('DEFAULT_LOCALE', () => {
  it('is es', () => {
    expect(DEFAULT_LOCALE).toBe('es')
  })
})

describe('LOCALE_LABELS', () => {
  it('has a label for every supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(LOCALE_LABELS[locale]).toBeTruthy()
    }
  })
})
