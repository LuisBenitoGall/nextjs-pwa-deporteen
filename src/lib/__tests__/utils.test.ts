import { describe, it, expect } from 'vitest'
import {
  cn,
  formatCurrency,
  formatBytes,
  getFileExtension,
  getMimeType,
  isFileTypeAllowed,
} from '../utils'

// ─── cn ──────────────────────────────────────────────────────────────────────

describe('cn', () => {
  it('merges class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('deduplicates conflicting tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('ignores falsy values', () => {
    expect(cn('foo', false, undefined, null, 'bar')).toBe('foo bar')
  })
})

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats EUR correctly', () => {
    const result = formatCurrency(19.99, 'EUR', 'es-ES')
    expect(result).toContain('19')
    expect(result).toContain('€')
  })

  it('handles lowercase currency code', () => {
    const result = formatCurrency(10, 'eur', 'es-ES')
    expect(result).toContain('€')
  })

  it('falls back gracefully for invalid currency', () => {
    const result = formatCurrency(10, 'INVALID_CURRENCY')
    expect(result).toContain('10')
  })
})

// ─── formatBytes ─────────────────────────────────────────────────────────────

describe('formatBytes', () => {
  it('returns "0 Bytes" for 0', () => {
    expect(formatBytes(0)).toBe('0 Bytes')
  })

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes')
  })

  it('formats KB', () => {
    expect(formatBytes(1024)).toBe('1 KB')
  })

  it('formats MB', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB')
  })

  it('respects decimals parameter', () => {
    expect(formatBytes(1500, 0)).toBe('1 KB')
    expect(formatBytes(1500, 3)).toBe('1.465 KB')
  })
})

// ─── getFileExtension ─────────────────────────────────────────────────────────

describe('getFileExtension', () => {
  it('returns the lowercase extension', () => {
    expect(getFileExtension('photo.JPG')).toBe('jpg')
    expect(getFileExtension('video.mp4')).toBe('mp4')
  })

  it('returns the full lowercased name when there is no dot', () => {
    // getFileExtension uses split('.').pop(), so "README" → "readme"
    expect(getFileExtension('README')).toBe('readme')
  })

  it('handles multiple dots', () => {
    expect(getFileExtension('archive.tar.gz')).toBe('gz')
  })
})

// ─── getMimeType ──────────────────────────────────────────────────────────────

describe('getMimeType', () => {
  it('returns correct MIME for images', () => {
    expect(getMimeType('jpg')).toBe('image/jpeg')
    expect(getMimeType('png')).toBe('image/png')
    expect(getMimeType('webp')).toBe('image/webp')
  })

  it('returns correct MIME for videos', () => {
    expect(getMimeType('mp4')).toBe('video/mp4')
    expect(getMimeType('webm')).toBe('video/webm')
  })

  it('returns octet-stream for unknown extension', () => {
    expect(getMimeType('xyz')).toBe('application/octet-stream')
  })
})

// ─── isFileTypeAllowed ────────────────────────────────────────────────────────

describe('isFileTypeAllowed', () => {
  const makeFile = (name: string, type: string) =>
    new File([''], name, { type })

  it('allows by exact MIME type', () => {
    const file = makeFile('photo.jpg', 'image/jpeg')
    expect(isFileTypeAllowed(file, ['image/jpeg'])).toBe(true)
  })

  it('allows by wildcard MIME type', () => {
    const file = makeFile('photo.png', 'image/png')
    expect(isFileTypeAllowed(file, ['image/*'])).toBe(true)
  })

  it('allows by extension', () => {
    const file = makeFile('doc.pdf', 'application/pdf')
    expect(isFileTypeAllowed(file, ['pdf'])).toBe(true)
  })

  it('rejects disallowed file', () => {
    const file = makeFile('script.exe', 'application/octet-stream')
    expect(isFileTypeAllowed(file, ['image/*', 'video/*'])).toBe(false)
  })

  it('rejects video when only images are allowed', () => {
    const file = makeFile('clip.mp4', 'video/mp4')
    expect(isFileTypeAllowed(file, ['image/*'])).toBe(false)
  })
})
