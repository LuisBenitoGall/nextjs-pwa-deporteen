export type AuthErrorCta = {
  href: string;
  labelKey: string;
  fallback: string;
};

export type AuthErrorPresentation = {
  messageKey: string;
  messageFallback: string;
  ctas: AuthErrorCta[];
};

const CTAS = {
  login: { href: '/login', labelKey: 'auth_error_cta_login', fallback: 'Ir a iniciar sesión' },
  home: { href: '/', labelKey: 'auth_error_cta_home', fallback: 'Volver al inicio' },
  forgot: {
    href: '/forgot-password',
    labelKey: 'auth_error_cta_forgot_password',
    fallback: 'Recuperar contraseña',
  },
  register: { href: '/registro', labelKey: 'auth_error_cta_register', fallback: 'Crear cuenta' },
} as const;

/** Errores conocidos en query string (login, middleware redirects). */
export function presentationFromAuthQuery(code: string | null): AuthErrorPresentation | null {
  if (!code) return null;
  switch (code) {
    case 'supabase_config':
      return {
        messageKey: 'error_supabase_config',
        messageFallback: 'El servicio no está configurado correctamente. Inténtalo más tarde.',
        ctas: [CTAS.home],
      };
    default:
      return null;
  }
}

/** Mensajes crudos de Supabase/API → copy amigable + CTAs. */
export function presentationFromAuthMessage(raw: string | null | undefined): AuthErrorPresentation {
  const msg = (raw || '').trim();
  const lower = msg.toLowerCase();

  if (!msg) {
    return {
      messageKey: 'auth_error_generic',
      messageFallback: 'No se pudo completar la acción. Inténtalo de nuevo.',
      ctas: [CTAS.login, CTAS.home],
    };
  }

  if (
    lower.includes('invalid login') ||
    lower.includes('invalid credentials') ||
    lower.includes('email not confirmed') ||
    lower.includes('confirm') ||
    lower.includes('credenciales')
  ) {
    return {
      messageKey: lower.includes('confirm') ? 'auth_error_email_not_confirmed' : 'auth_error_invalid_credentials',
      messageFallback: lower.includes('confirm')
        ? 'Confirma tu email antes de iniciar sesión.'
        : 'Email o contraseña incorrectos.',
      ctas: [CTAS.forgot, CTAS.register],
    };
  }

  if (
    lower.includes('caducad') ||
    lower.includes('expired') ||
    lower.includes('session') ||
    lower.includes('enlace') ||
    lower.includes('code verifier') ||
    lower.includes('callback')
  ) {
    return {
      messageKey: 'auth_error_session_expired',
      messageFallback: 'La sesión o el enlace ha caducado. Vuelve a iniciar sesión.',
      ctas: [CTAS.login, CTAS.forgot],
    };
  }

  if (lower.includes('too many') || lower.includes('rate') || lower.includes('429')) {
    return {
      messageKey: 'auth_error_rate_limited',
      messageFallback: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
      ctas: [CTAS.home],
    };
  }

  return {
    messageKey: 'auth_error_generic',
    messageFallback: msg,
    ctas: [CTAS.login, CTAS.home],
  };
}
