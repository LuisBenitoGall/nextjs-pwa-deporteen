import { describe, it, expect } from 'vitest';
import {
  analyzeRPCError,
  getUserFriendlyMessage,
  isCOALESCETypeError,
  RPCErrorType,
  type RPCError,
} from './rpc-error-handler';

describe('rpc-error-handler', () => {
  describe('analyzeRPCError', () => {
    it('should detect COALESCE type mismatch error', () => {
      const error: RPCError = {
        message: 'COALESCE types text and boolean cannot be matched',
        code: '42804',
        details: 'Parameter $1 = coalesce(is_active, active)',
      };

      const result = analyzeRPCError(error);

      expect(result.hasError).toBe(true);
      expect(result.errorType).toBe(RPCErrorType.COALESCE_TYPE_MISMATCH);
      expect(result.message).toContain('COALESCE types');
      expect(result.userMessage).toContain('tipos incompatibles');
      expect(result.solution).toContain('fix_create_player_link_subscription_DIRECTO.sql');
      expect(result.code).toBe('42804');
    });

    it('should detect general type mismatch error', () => {
      const error: RPCError = {
        message: 'Type integer cannot be matched with text',
        code: '42804',
      };

      const result = analyzeRPCError(error);

      expect(result.hasError).toBe(true);
      expect(result.errorType).toBe(RPCErrorType.TYPE_MISMATCH);
      expect(result.userMessage).toContain('tipos incompatibles');
    });

    it('should detect column not found error', () => {
      const error: RPCError = {
        message: 'Column "is_active" does not exist',
        code: '42703',
      };

      const result = analyzeRPCError(error);

      expect(result.hasError).toBe(true);
      expect(result.errorType).toBe(RPCErrorType.COLUMN_NOT_FOUND);
      expect(result.userMessage).toContain('columna referenciada no existe');
    });

    it('should detect function not found error', () => {
      const error: RPCError = {
        message: 'Function create_player_link_subscription does not exist',
        code: '42883',
      };

      const result = analyzeRPCError(error);

      expect(result.hasError).toBe(true);
      expect(result.errorType).toBe(RPCErrorType.FUNCTION_NOT_FOUND);
      expect(result.userMessage).toContain('función no existe');
    });

    it('should detect permission denied error', () => {
      const error: RPCError = {
        message: 'Permission denied',
        code: '42501',
      };

      const result = analyzeRPCError(error);

      expect(result.hasError).toBe(true);
      expect(result.errorType).toBe(RPCErrorType.PERMISSION_DENIED);
      expect(result.userMessage).toContain('no tienes permisos');
    });

    it('should detect NOT NULL violation', () => {
      const error: RPCError = {
        message: 'null value violates not-null constraint',
        code: '23502',
      };

      const result = analyzeRPCError(error);

      expect(result.hasError).toBe(true);
      expect(result.errorType).toBe(RPCErrorType.NOT_NULL_VIOLATION);
      expect(result.userMessage).toContain('campo requerido');
    });

    it('should detect foreign key violation', () => {
      const error: RPCError = {
        message: 'Foreign key constraint violation',
        code: '23503',
      };

      const result = analyzeRPCError(error);

      expect(result.hasError).toBe(true);
      expect(result.errorType).toBe(RPCErrorType.FOREIGN_KEY_VIOLATION);
      expect(result.userMessage).toContain('referencia inválida');
    });

    it('should detect unique violation', () => {
      const error: RPCError = {
        message: 'Unique constraint violation',
        code: '23505',
      };

      const result = analyzeRPCError(error);

      expect(result.hasError).toBe(true);
      expect(result.errorType).toBe(RPCErrorType.UNIQUE_VIOLATION);
      expect(result.userMessage).toContain('ya existe');
    });

    it('should return no error for null', () => {
      const result = analyzeRPCError(null);

      expect(result.hasError).toBe(false);
      expect(result.errorType).toBeNull();
      expect(result.message).toBe('');
      expect(result.userMessage).toBe('');
    });

    it('should handle unknown errors', () => {
      const error: RPCError = {
        message: 'Some unknown error',
      };

      const result = analyzeRPCError(error);

      expect(result.hasError).toBe(true);
      expect(result.errorType).toBe(RPCErrorType.OTHER);
      expect(result.userMessage).toBe('Some unknown error');
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return friendly message for COALESCE error', () => {
      const error: RPCError = {
        message: 'COALESCE types text and boolean cannot be matched',
      };

      const message = getUserFriendlyMessage(error);

      expect(message).toContain('tipos incompatibles');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should return empty string for null error', () => {
      const message = getUserFriendlyMessage(null);
      expect(message).toBe('');
    });
  });

  describe('isCOALESCETypeError', () => {
    it('should return true for COALESCE type error', () => {
      const error: RPCError = {
        message: 'COALESCE types text and boolean cannot be matched',
      };

      expect(isCOALESCETypeError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error: RPCError = {
        message: 'Some other error',
      };

      expect(isCOALESCETypeError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isCOALESCETypeError(null)).toBe(false);
    });
  });
});
