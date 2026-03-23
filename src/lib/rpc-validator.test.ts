import { describe, it, expect } from 'vitest';
import { detectRPCTypeErrors, validateCreatePlayerParams } from './rpc-validator';

describe('rpc-validator', () => {
  describe('detectRPCTypeErrors', () => {
    it('should detect COALESCE type mismatch error', () => {
      const error = {
        message: 'COALESCE types text and boolean cannot be matched',
        code: '42804',
      };

      const result = detectRPCTypeErrors(error);

      expect(result.hasError).toBe(true);
      expect(result.errorType).toBe('COALESCE_TYPE_MISMATCH');
      expect(result.message).toContain('COALESCE');
    });

    it('should detect general type mismatch error', () => {
      const error = {
        message: 'Type integer cannot be matched with text',
        code: '42804',
      };

      const result = detectRPCTypeErrors(error);

      expect(result.hasError).toBe(true);
      expect(result.errorType).toBe('TYPE_MISMATCH');
    });

    it('should detect column not found error', () => {
      const error = {
        message: 'Column "is_active" does not exist',
        code: '42703',
      };

      const result = detectRPCTypeErrors(error);

      expect(result.hasError).toBe(true);
      expect(result.errorType).toBe('COLUMN_NOT_FOUND');
    });

    it('should return no error for null', () => {
      const result = detectRPCTypeErrors(null);

      expect(result.hasError).toBe(false);
      expect(result.errorType).toBeNull();
    });

    it('should handle unknown errors', () => {
      const error = {
        message: 'Some other error',
      };

      const result = detectRPCTypeErrors(error);

      expect(result.hasError).toBe(true);
      expect(result.errorType).toBe('OTHER');
    });
  });

  describe('validateCreatePlayerParams', () => {
    it('should validate correct parameters', () => {
      const params = {
        p_full_name: 'Test Player',
        p_birthday: null,
        p_status: true,
        p_code_text: null,
      };

      const result = validateCreatePlayerParams(params);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid p_full_name type', () => {
      const params = {
        p_full_name: 123, // Debe ser string
        p_birthday: null,
        p_status: true,
        p_code_text: null,
      };

      const result = validateCreatePlayerParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e: string) => e.includes('p_full_name') && e.includes('debe ser string'))).toBe(true);
    });

    it('should detect invalid p_status type', () => {
      const params = {
        p_full_name: 'Test Player',
        p_birthday: null,
        p_status: 'true', // Debe ser boolean, no string
        p_code_text: null,
      };

      const result = validateCreatePlayerParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e: string) => e.includes('p_status'))).toBe(true);
    });

    it('should detect invalid p_code_text type', () => {
      const params = {
        p_full_name: 'Test Player',
        p_birthday: null,
        p_status: true,
        p_code_text: 123, // Debe ser string o null
      };

      const result = validateCreatePlayerParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e: string) => e.includes('p_code_text'))).toBe(true);
    });

    it('should accept valid date string for p_birthday', () => {
      const params = {
        p_full_name: 'Test Player',
        p_birthday: '2020-01-01',
        p_status: true,
        p_code_text: null,
      };

      const result = validateCreatePlayerParams(params);

      expect(result.valid).toBe(true);
    });

    it('should accept Date object for p_birthday', () => {
      const params = {
        p_full_name: 'Test Player',
        p_birthday: new Date('2020-01-01'),
        p_status: true,
        p_code_text: null,
      };

      const result = validateCreatePlayerParams(params);

      expect(result.valid).toBe(true);
    });
  });
});
