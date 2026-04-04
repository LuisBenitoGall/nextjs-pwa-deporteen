// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Submit from '../Submit'

describe('Submit', () => {
  it('renders the idle text', () => {
    render(<Submit text="Guardar" />)
    expect(screen.getByRole('button')).toHaveTextContent('Guardar')
  })

  it('is type="submit" by default', () => {
    render(<Submit text="Enviar" />)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('shows loadingText when loading=true', () => {
    render(<Submit text="Guardar" loading loadingText="Guardando…" />)
    expect(screen.getByRole('button')).toHaveTextContent('Guardando…')
  })

  it('falls back to "Procesando…" when loading but no loadingText', () => {
    render(<Submit text="Enviar" loading />)
    expect(screen.getByRole('button')).toHaveTextContent('Procesando…')
  })

  it('is disabled when loading=true', () => {
    render(<Submit text="Enviar" loading />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when disabled=true', () => {
    render(<Submit text="Enviar" disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is enabled when neither loading nor disabled', () => {
    render(<Submit text="Enviar" />)
    expect(screen.getByRole('button')).toBeEnabled()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Submit text="Enviar" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(<Submit text="Enviar" disabled onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
