import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isAdminUser } from '../roles'
import type { User } from '@supabase/supabase-js'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '',
    ...overrides,
  } as User
}

describe('isAdminUser', () => {
  const originalEnv = process.env.ADMIN_EMAILS

  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'admin@deporteen.com,otro@deporteen.com'
  })

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalEnv
  })

  it('returns false for null', () => {
    expect(isAdminUser(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isAdminUser(undefined)).toBe(false)
  })

  it('returns true when email matches ADMIN_EMAILS', () => {
    expect(isAdminUser(makeUser({ email: 'admin@deporteen.com' }))).toBe(true)
  })

  it('is case-insensitive for email check', () => {
    expect(isAdminUser(makeUser({ email: 'ADMIN@DEPORTEEN.COM' }))).toBe(true)
  })

  it('returns false for non-admin email', () => {
    expect(isAdminUser(makeUser({ email: 'regular@example.com' }))).toBe(false)
  })

  it('returns true when user_metadata.role is "admin"', () => {
    const user = makeUser({ user_metadata: { role: 'admin' } })
    expect(isAdminUser(user)).toBe(true)
  })

  it('returns true when app_metadata.role is "admin"', () => {
    const user = makeUser({ app_metadata: { role: 'admin' } })
    expect(isAdminUser(user)).toBe(true)
  })

  it('returns true when permissions includes "admin"', () => {
    const user = makeUser({ user_metadata: { permissions: ['read', 'admin'] } })
    expect(isAdminUser(user)).toBe(true)
  })

  it('returns false when permissions does not include "admin"', () => {
    const user = makeUser({ user_metadata: { permissions: ['read', 'write'] } })
    expect(isAdminUser(user)).toBe(false)
  })

  it('returns false when env var is empty', () => {
    process.env.ADMIN_EMAILS = ''
    expect(isAdminUser(makeUser({ email: 'admin@deporteen.com' }))).toBe(false)
  })
})
