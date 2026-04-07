// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Input from '../Input'

describe('Input', () => {
  it('renders label when provided', () => {
    render(<Input name="email" label="Correo electrónico" />)
    expect(screen.getByText('Correo electrónico')).toBeInTheDocument()
  })

  it('label is linked to input via htmlFor', () => {
    render(<Input name="email" label="Email" />)
    const label = screen.getByText('Email')
    const input = screen.getByRole('textbox')
    expect(label).toHaveAttribute('for', input.id)
  })

  it('renders without label', () => {
    render(<Input name="field" />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('forwards type to the input element', () => {
    render(<Input name="pass" type="password" />)
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument()
  })

  it('shows error message when error prop is set', () => {
    render(<Input name="email" error="El email es inválido" />)
    expect(screen.getByText('El email es inválido')).toBeInTheDocument()
  })

  it('sets aria-invalid when error is present', () => {
    render(<Input name="email" error="Error" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not set aria-invalid when no error', () => {
    render(<Input name="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false')
  })

  it('shows helpText when provided', () => {
    render(<Input name="phone" helpText="Solo números" />)
    expect(screen.getByText('Solo números')).toBeInTheDocument()
  })

  it('links helpText via aria-describedby', () => {
    render(<Input name="phone" helpText="Solo números" />)
    const input = screen.getByRole('textbox')
    const helpId = input.getAttribute('aria-describedby')
    expect(helpId).toBeTruthy()
    expect(document.getElementById(helpId!)).toHaveTextContent('Solo números')
  })

  it('applies maxLength when provided', () => {
    render(<Input name="bio" maxLength={100} />)
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '100')
  })

  it('accepts maxlength (lowercase alias) as well', () => {
    render(<Input name="bio" maxlength={50} />)
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '50')
  })

  it('does not set maxLength when value is 0', () => {
    render(<Input name="bio" maxLength={0} />)
    expect(screen.getByRole('textbox')).not.toHaveAttribute('maxLength')
  })
})
