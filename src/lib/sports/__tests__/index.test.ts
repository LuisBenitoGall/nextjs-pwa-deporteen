import { describe, it, expect } from 'vitest'
import { normalizeSlug, getSportIconPath, SPORTS } from '../index'

// ─── normalizeSlug ────────────────────────────────────────────────────────────

describe('normalizeSlug', () => {
  it('lowercases input', () => {
    expect(normalizeSlug('Futbol')).toBe('futbol')
  })

  it('removes diacritics', () => {
    expect(normalizeSlug('Fútbol')).toBe('futbol')
    expect(normalizeSlug('Baloncesto')).toBe('baloncesto')
  })

  it('replaces spaces with hyphens', () => {
    expect(normalizeSlug('Fútbol Sala')).toBe('futbol-sala')
    expect(normalizeSlug('Hockey Hierba')).toBe('hockey-hierba')
  })

  it('removes non-alphanumeric characters (except hyphens)', () => {
    expect(normalizeSlug('hello@world!')).toBe('helloworld')
  })

  it('handles undefined', () => {
    expect(normalizeSlug(undefined)).toBe('')
  })

  it('handles empty string', () => {
    expect(normalizeSlug('')).toBe('')
  })
})

// ─── getSportIconPath ─────────────────────────────────────────────────────────

describe('getSportIconPath', () => {
  it('returns icon for exact slug match', () => {
    expect(getSportIconPath('futbol')).toBe('/icons/icon-futbol.png')
    expect(getSportIconPath('baloncesto')).toBe('/icons/icon-baloncesto.png')
  })

  it('returns icon for accented name (normalizes internally)', () => {
    expect(getSportIconPath('Fútbol')).toBe('/icons/icon-futbol.png')
    expect(getSportIconPath('FÚTBOL')).toBe('/icons/icon-futbol.png')
  })

  it('returns icon for multi-word sport name', () => {
    expect(getSportIconPath('Fútbol Sala')).toBe('/icons/icon-futbol-sala.png')
    expect(getSportIconPath('Hockey Hierba')).toBe('/icons/icon-hockey-hierba.png')
  })

  it('returns null for unknown sport', () => {
    expect(getSportIconPath('tenis')).toBeNull()
    expect(getSportIconPath('natacion')).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(getSportIconPath(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getSportIconPath('')).toBeNull()
  })
})

// ─── SPORTS catalog ───────────────────────────────────────────────────────────

describe('SPORTS', () => {
  it('every sport has name, icon, and slug', () => {
    for (const sport of SPORTS) {
      expect(sport.name).toBeTruthy()
      expect(sport.icon).toMatch(/^\/icons\//)
      expect(sport.slug).toBeTruthy()
    }
  })

  it('slugs are unique', () => {
    const slugs = SPORTS.map(s => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('slugs are already normalized (no uppercase or accents)', () => {
    for (const sport of SPORTS) {
      expect(normalizeSlug(sport.slug)).toBe(sport.slug)
    }
  })
})
