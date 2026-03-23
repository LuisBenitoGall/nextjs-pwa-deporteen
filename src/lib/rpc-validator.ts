/**
 * Validador de tipos para RPCs de Supabase
 * 
 * Este módulo ayuda a detectar errores de tipos antes de ejecutar RPCs
 */

/**
 * Detecta errores comunes de tipos en respuestas de RPC
 */
export function detectRPCTypeErrors(error: {
  message: string;
  code?: string;
  details?: string;
} | null): {
  hasError: boolean;
  errorType: 'COALESCE_TYPE_MISMATCH' | 'TYPE_MISMATCH' | 'COLUMN_NOT_FOUND' | 'OTHER' | null;
  message: string;
} {
  if (!error) {
    return { hasError: false, errorType: null, message: '' };
  }

  const msg = error.message.toLowerCase();
  
  // Error específico de COALESCE con tipos incompatibles
  if (msg.includes('coalesce types') && msg.includes('cannot be matched')) {
    return {
      hasError: true,
      errorType: 'COALESCE_TYPE_MISMATCH',
      message: 'Error de tipos en COALESCE: tipos incompatibles (text y boolean)',
    };
  }

  // Error de tipo incompatible general
  if (msg.includes('type') && (msg.includes('cannot be') || msg.includes('does not match'))) {
    return {
      hasError: true,
      errorType: 'TYPE_MISMATCH',
      message: 'Error de tipos: tipos incompatibles en operación',
    };
  }

  // Error de columna no encontrada
  if (msg.includes('column') && (msg.includes('does not exist') || msg.includes('not found'))) {
    return {
      hasError: true,
      errorType: 'COLUMN_NOT_FOUND',
      message: 'Error: columna no encontrada en el esquema',
    };
  }

  return {
    hasError: true,
    errorType: 'OTHER',
    message: error.message,
  };
}

/**
 * Valida que los parámetros de create_player_link_subscription tienen los tipos correctos
 */
export function validateCreatePlayerParams(params: {
  p_full_name: any;
  p_birthday: any;
  p_status: any;
  p_code_text: any;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof params.p_full_name !== 'string') {
    errors.push(`p_full_name debe ser string, recibido: ${typeof params.p_full_name}`);
  }

  if (params.p_birthday !== null && !(params.p_birthday instanceof Date) && typeof params.p_birthday !== 'string') {
    errors.push(`p_birthday debe ser Date, string o null, recibido: ${typeof params.p_birthday}`);
  }

  if (typeof params.p_status !== 'boolean') {
    errors.push(`p_status debe ser boolean, recibido: ${typeof params.p_status}`);
  }

  if (params.p_code_text !== null && typeof params.p_code_text !== 'string') {
    errors.push(`p_code_text debe ser string o null, recibido: ${typeof params.p_code_text}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
