import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isAdminUser } from './roles';
import type { User } from '@supabase/supabase-js';

// Mock de variables de entorno
const originalEnv = process.env;

describe('roles', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isAdminUser', () => {
    it('should return false for null user', () => {
      expect(isAdminUser(null)).toBe(false);
      expect(isAdminUser(undefined)).toBe(false);
    });

    it('should return true for user with admin email', () => {
      process.env.NEXT_PUBLIC_ADMIN_EMAILS = 'admin@test.com,other@test.com';
      
      const user: Partial<User> = {
        email: 'admin@test.com',
      };
      
      expect(isAdminUser(user as User)).toBe(true);
    });

    it('should return true for user with admin role in user_metadata', () => {
      const user: Partial<User> = {
        email: 'user@test.com',
        user_metadata: {
          role: 'admin',
        },
      };
      
      expect(isAdminUser(user as User)).toBe(true);
    });

    it('should return true for user with admin role in app_metadata', () => {
      const user: Partial<User> = {
        email: 'user@test.com',
        app_metadata: {
          role: 'admin',
        },
      };
      
      expect(isAdminUser(user as User)).toBe(true);
    });

    it('should return true for user with admin permission in permissions array', () => {
      const user: Partial<User> = {
        email: 'user@test.com',
        user_metadata: {
          permissions: ['admin', 'editor'],
        },
      };
      
      expect(isAdminUser(user as User)).toBe(true);
    });

    it('should return false for regular user', () => {
      const user: Partial<User> = {
        email: 'user@test.com',
        user_metadata: {
          role: 'user',
        },
      };
      
      expect(isAdminUser(user as User)).toBe(false);
    });

    it('should handle case-insensitive email matching', () => {
      process.env.NEXT_PUBLIC_ADMIN_EMAILS = 'Admin@Test.com';
      
      const user: Partial<User> = {
        email: 'admin@test.com',
      };
      
      expect(isAdminUser(user as User)).toBe(true);
    });

    it('should handle case-insensitive role matching', () => {
      const user: Partial<User> = {
        email: 'user@test.com',
        user_metadata: {
          role: 'ADMIN',
        },
      };
      
      expect(isAdminUser(user as User)).toBe(true);
    });
  });
});
