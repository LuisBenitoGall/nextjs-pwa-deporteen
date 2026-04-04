// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LanguageSwitcher from '../LanguageSwitcher'

// Mock the i18n context so we can control locale state in tests
const mockSetLocale = vi.fn()

vi.mock('@/i18n/I18nProvider', () => ({
  useLocale: vi.fn(() => ({
    locale: 'es',
    setLocale: mockSetLocale,
    locales: [
      { code: 'es', label: 'Castellano' },
      { code: 'en', label: 'English' },
      { code: 'ca', label: 'Català' },
    ],
  })),
}))

describe('LanguageSwitcher', () => {
  it('renders a button for each locale', () => {
    render(<LanguageSwitcher />)
    expect(screen.getByRole('button', { name: 'Castellano' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Català' })).toBeInTheDocument()
  })

  it('disables the currently active locale button', () => {
    render(<LanguageSwitcher />)
    // locale = 'es' → Castellano should be disabled
    expect(screen.getByRole('button', { name: 'Castellano' })).toBeDisabled()
  })

  it('keeps other locale buttons enabled', () => {
    render(<LanguageSwitcher />)
    expect(screen.getByRole('button', { name: 'English' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Català' })).toBeEnabled()
  })

  it('calls setLocale when a non-active locale is clicked', () => {
    render(<LanguageSwitcher />)
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(mockSetLocale).toHaveBeenCalledWith('en')
  })

  it('does not call setLocale when the active locale is clicked', () => {
    mockSetLocale.mockClear()
    render(<LanguageSwitcher />)
    // The active button is disabled so the click won't fire, but even if it did:
    fireEvent.click(screen.getByRole('button', { name: 'Castellano' }))
    expect(mockSetLocale).not.toHaveBeenCalled()
  })

  it('disables a locale marked as disabled in the locales list', async () => {
    const { useLocale } = await import('@/i18n/I18nProvider')
    vi.mocked(useLocale).mockReturnValueOnce({
      locale: 'es',
      setLocale: mockSetLocale,
      locales: [
        { code: 'es', label: 'Castellano' },
        { code: 'en', label: 'English', disabled: true },
        { code: 'ca', label: 'Català' },
      ],
    })
    render(<LanguageSwitcher />)
    expect(screen.getByRole('button', { name: 'English' })).toBeDisabled()
  })
})
