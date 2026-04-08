/**
 * Manejo de errores de RPCs de Supabase
 * 
 * Este módulo proporciona utilidades para detectar y manejar errores
 * específicos de RPCs, especialmente errores de tipos.
 */

export type RPCError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

/**
 * Tipos de errores de RPC detectables
 */
export enum RPCErrorType {
  COALESCE_TYPE_MISMATCH = 'COALESCE_TYPE_MISMATCH',
  TYPE_MISMATCH = 'TYPE_MISMATCH',
  COLUMN_NOT_FOUND = 'COLUMN_NOT_FOUND',
  FUNCTION_NOT_FOUND = 'FUNCTION_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_NULL_VIOLATION = 'NOT_NULL_VIOLATION',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  UNIQUE_VIOLATION = 'UNIQUE_VIOLATION',
  OTHER = 'OTHER',
}

/**
 * Información detallada sobre un error de RPC
 */
export interface RPCErrorInfo {
  hasError: boolean;
  errorType: RPCErrorType | null;
  message: string;
  userMessage: string; // Mensaje amigable para el usuario
  solution?: string; // Solución sugerida
  code?: string; // Código de error PostgreSQL
}

/**
 * Detecta el tipo de error de RPC y proporciona información útil
 */
export function analyzeRPCError(error: RPCError | null): RPCErrorInfo {
  if (!error) {
    return {
      hasError: false,
      errorType: null,
      message: '',
      userMessage: '',
    };
  }

  const msg = error.message.toLowerCase();
  const code = error.code;

  // Error específico de COALESCE con tipos incompatibles
  if (msg.includes('coalesce types') && msg.includes('cannot be matched')) {
    return {
      hasError: true,
      errorType: RPCErrorType.COALESCE_TYPE_MISMATCH,
      message: error.message,
      userMessage: 'Error en la base de datos: tipos incompatibles en operación COALESCE',
      solution: 'La función RPC necesita ser corregida. Ejecutar: database/fixes/create_player_link_subscription/fix_create_player_link_subscription_DIRECTO.sql',
      code,
    };
  }

  // Error de tipo incompatible general
  if (msg.includes('type') && (msg.includes('cannot be') || msg.includes('does not match'))) {
    return {
      hasError: true,
      errorType: RPCErrorType.TYPE_MISMATCH,
      message: error.message,
      userMessage: 'Error de tipos: tipos incompatibles en la base de datos',
      solution: 'Verificar los tipos de datos en la función RPC',
      code,
    };
  }

  // Error de columna no encontrada
  if (msg.includes('column') && (msg.includes('does not exist') || msg.includes('not found'))) {
    return {
      hasError: true,
      errorType: RPCErrorType.COLUMN_NOT_FOUND,
      message: error.message,
      userMessage: 'Error: una columna referenciada no existe en la base de datos',
      solution: 'Verificar el esquema de la base de datos y actualizar la función RPC',
      code,
    };
  }

  // Error de función no encontrada
  if (msg.includes('function') && msg.includes('does not exist')) {
    return {
      hasError: true,
      errorType: RPCErrorType.FUNCTION_NOT_FOUND,
      message: error.message,
      userMessage: 'Error: la función no existe en la base de datos',
      solution: 'Crear la función RPC en Supabase',
      code,
    };
  }

  // Error de permisos
  if (code === '42501' || msg.includes('permission denied')) {
    return {
      hasError: true,
      errorType: RPCErrorType.PERMISSION_DENIED,
      message: error.message,
      userMessage: 'Error: no tienes permisos para realizar esta acción',
      solution: 'Verificar Row Level Security (RLS) y permisos de la función',
      code,
    };
  }

  // Error de NOT NULL
  if (code === '23502' || msg.includes('null value') && msg.includes('violates not-null')) {
    return {
      hasError: true,
      errorType: RPCErrorType.NOT_NULL_VIOLATION,
      message: error.message,
      userMessage: 'Error: un campo requerido está vacío',
      solution: 'Asegúrate de proporcionar todos los campos obligatorios',
      code,
    };
  }

  // Error de Foreign Key
  if (code === '23503' || msg.includes('foreign key')) {
    return {
      hasError: true,
      errorType: RPCErrorType.FOREIGN_KEY_VIOLATION,
      message: error.message,
      userMessage: 'Error: referencia inválida a otro registro',
      solution: 'Verificar que los IDs referenciados existen',
      code,
    };
  }

  // Error de Unique
  if (code === '23505' || msg.includes('unique')) {
    return {
      hasError: true,
      errorType: RPCErrorType.UNIQUE_VIOLATION,
      message: error.message,
      userMessage: 'Error: el registro ya existe',
      solution: 'El registro que intentas crear ya existe en la base de datos',
      code,
    };
  }

  // Error genérico
  return {
    hasError: true,
    errorType: RPCErrorType.OTHER,
    message: error.message,
    userMessage: error.message || 'Error desconocido en la base de datos',
    code,
  };
}

/**
 * Obtiene un mensaje de usuario amigable basado en el error
 */
export function getUserFriendlyMessage(error: RPCError | null): string {
  if (!error) return '';
  const analysis = analyzeRPCError(error);
  return analysis.userMessage || 'Ha ocurrido un error inesperado';
}

/**
 * Verifica si un error es específico de COALESCE type mismatch
 */
export function isCOALESCETypeError(error: RPCError | null): boolean {
  return analyzeRPCError(error).errorType === RPCErrorType.COALESCE_TYPE_MISMATCH;
}
