import { describe, it, expect } from 'vitest'
import { makeT, getDictionary } from '../dictionary'

// ─── makeT ───────────────────────────────────────────────────────────────────

describe('makeT — key lookup', () => {
  const dict = { greeting: 'Hola', nested: { deep: 'Profundo' } }
  const t = makeT(dict)

  it('returns the value for a top-level key', () => {
    expect(t('greeting')).toBe('Hola')
  })

  it('returns the value for a nested key', () => {
    expect(t('nested.deep')).toBe('Profundo')
  })

  it('returns the key itself when not found', () => {
    expect(t('missing_key')).toBe('missing_key')
    expect(t('nested.missing')).toBe('nested.missing')
  })
})

describe('makeT — interpolation', () => {
  // Note: the regex only matches UPPERCASE variables: {VAR_NAME}
  const dict = { msg: 'Hola {NAME}, tienes {COUNT} mensajes' }
  const t = makeT(dict)

  it('interpolates uppercase variables', () => {
    expect(t('msg', { NAME: 'Luis', COUNT: 3 })).toBe('Hola Luis, tienes 3 mensajes')
  })

  it('keeps the placeholder when variable is missing', () => {
    expect(t('msg', { NAME: 'Luis' })).toBe('Hola Luis, tienes {COUNT} mensajes')
  })

  it('keeps the placeholder when variable is null', () => {
    expect(t('msg', { NAME: 'Luis', COUNT: null })).toBe('Hola Luis, tienes {COUNT} mensajes')
  })

  it('returns plain string when no vars passed', () => {
    const t2 = makeT({ hello: 'Sin variables' })
    expect(t2('hello')).toBe('Sin variables')
  })
})

// ─── getDictionary ────────────────────────────────────────────────────────────

describe('getDictionary', () => {
  it('returns es dict for "es"', async () => {
    const { locale, dict } = await getDictionary('es')
    expect(locale).toBe('es')
    expect(typeof dict).toBe('object')
  })

  it('returns en dict for "en"', async () => {
    const { locale, dict } = await getDictionary('en')
    expect(locale).toBe('en')
    expect(typeof dict).toBe('object')
  })

  it('returns ca dict for "ca"', async () => {
    const { locale, dict } = await getDictionary('ca')
    expect(locale).toBe('ca')
    expect(typeof dict).toBe('object')
  })

  it('falls back to es for unknown locale', async () => {
    const { locale } = await getDictionary('fr')
    expect(locale).toBe('es')
  })

  it('falls back to es when no locale provided', async () => {
    const { locale } = await getDictionary()
    expect(locale).toBe('es')
  })
})
