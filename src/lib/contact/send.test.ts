import { describe, it, expect } from 'vitest';
import { validateContactPayload, normalizeLoggedIn } from './send';
import type { ContactPayload } from './send';

describe('contact/send', () => {
  describe('normalizeLoggedIn', () => {
    it('should return true for boolean true', () => {
      expect(normalizeLoggedIn(true)).toBe(true);
    });

    it('should return false for boolean false', () => {
      expect(normalizeLoggedIn(false)).toBe(false);
    });

    it('should return true for string "true"', () => {
      expect(normalizeLoggedIn('true')).toBe(true);
      expect(normalizeLoggedIn('TRUE')).toBe(true);
      expect(normalizeLoggedIn('True')).toBe(true);
    });

    it('should return false for other values', () => {
      expect(normalizeLoggedIn('false')).toBe(false);
      expect(normalizeLoggedIn('')).toBe(false);
      expect(normalizeLoggedIn(null)).toBe(false);
      expect(normalizeLoggedIn(undefined)).toBe(false);
    });
  });

  describe('validateContactPayload', () => {
    it('should validate logged-in user payload', () => {
      const payload: ContactPayload = {
        subject: 'Test subject',
        message: 'Test message',
        logged_in: true,
      };

      const result = validateContactPayload(payload);
      expect(result.ok).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should validate logged-out user payload with all fields', () => {
      const payload: ContactPayload = {
        subject: 'Test subject',
        message: 'Test message',
        name: 'John Doe',
        email: 'john@example.com',
        logged_in: false,
      };

      const result = validateContactPayload(payload);
      expect(result.ok).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should reject payload without subject', () => {
      const payload: ContactPayload = {
        subject: '',
        message: 'Test message',
        logged_in: true,
      };

      const result = validateContactPayload(payload);
      expect(result.ok).toBe(false);
      expect(result.errors.subject).toBe('Asunto requerido');
    });

    it('should reject payload without message', () => {
      const payload: ContactPayload = {
        subject: 'Test subject',
        message: '',
        logged_in: true,
      };

      const result = validateContactPayload(payload);
      expect(result.ok).toBe(false);
      expect(result.errors.message).toBe('Mensaje requerido');
    });

    it('should reject logged-out payload without name', () => {
      const payload: ContactPayload = {
        subject: 'Test subject',
        message: 'Test message',
        email: 'john@example.com',
        logged_in: false,
      };

      const result = validateContactPayload(payload);
      expect(result.ok).toBe(false);
      expect(result.errors.name).toBe('Nombre requerido');
    });

    it('should reject logged-out payload without email', () => {
      const payload: ContactPayload = {
        subject: 'Test subject',
        message: 'Test message',
        name: 'John Doe',
        logged_in: false,
      };

      const result = validateContactPayload(payload);
      expect(result.ok).toBe(false);
      expect(result.errors.email).toBe('Email requerido');
    });

    it('should handle whitespace-only fields', () => {
      const payload: ContactPayload = {
        subject: '   ',
        message: '   ',
        logged_in: true,
      };

      const result = validateContactPayload(payload);
      expect(result.ok).toBe(false);
      expect(result.errors.subject).toBe('Asunto requerido');
      expect(result.errors.message).toBe('Mensaje requerido');
    });
  });
});
