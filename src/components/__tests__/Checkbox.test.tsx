// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Checkbox from '../Checkbox'

describe('Checkbox', () => {
  it('renders the label', () => {
    render(<Checkbox label="Acepto los términos" />)
    expect(screen.getByText('Acepto los términos')).toBeInTheDocument()
  })

  it('renders a checkbox input', () => {
    render(<Checkbox label="Acepto" />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('shows error message when error is set', () => {
    render(<Checkbox label="Acepto" error="Campo obligatorio" />)
    expect(screen.getByText('Campo obligatorio')).toBeInTheDocument()
  })

  it('sets aria-invalid when error is present', () => {
    render(<Checkbox label="Acepto" error="Error" />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not set aria-invalid when no error', () => {
    render(<Checkbox label="Acepto" />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'false')
  })

  it('passes extra props to the input (e.g. required)', () => {
    render(<Checkbox label="Acepto" required />)
    expect(screen.getByRole('checkbox')).toBeRequired()
  })

  it('accepts ReactNode as label', () => {
    render(<Checkbox label={<strong>Negrita</strong>} />)
    expect(screen.getByText('Negrita')).toBeInTheDocument()
  })
})
