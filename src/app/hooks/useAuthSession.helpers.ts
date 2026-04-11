export const AUTH_SESSION_TIMEOUT_MS = 4000;

export const AUTH_CONFIGURATION_ERROR =
  'Autenticación no configurada. Define las credenciales de Supabase antes de continuar.';

export const AUTH_OFFLINE_MESSAGE =
  'Sin conexión a internet. No se pudo validar la sesión con Supabase.';

export type AuthErrorContext =
  | 'session'
  | 'signin'
  | 'signup'
  | 'request_reset'
  | 'update_password'
  | 'signout';

export function isNetworkErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('internet_disconnected') ||
    normalized.includes('load failed')
  );
}

export function normalizeAuthErrorMessage(message: string, context: AuthErrorContext): string {
  const normalized = message.trim().toLowerCase();
  if (!normalized) {
    if (context === 'request_reset') return 'No pudimos enviar el correo de recuperación.';
    if (context === 'update_password') return 'No pudimos actualizar tu contraseña.';
    if (context === 'signout') return 'No pudimos cerrar tu sesión.';
    if (context === 'signup') return 'No pudimos crear tu cuenta.';
    return 'No pudimos completar la autenticación.';
  }

  if (normalized === 'auth-session-timeout') {
    return 'No pudimos validar tu sesión a tiempo. Reintenta.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Tu correo aún no ha sido confirmado.';
  }
  if (normalized.includes('user already registered')) {
    return 'Ya existe una cuenta con ese correo.';
  }
  if (normalized.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (normalized.includes('password is too weak') || normalized.includes('weak password')) {
    return 'La contraseña es muy débil. Usa al menos 8 caracteres.';
  }
  if (normalized.includes('signup is disabled')) {
    return 'El registro no está habilitado en este entorno.';
  }
  if (normalized.includes('for security purposes') || normalized.includes('rate limit')) {
    return 'Demasiados intentos. Espera un momento y vuelve a intentarlo.';
  }
  if (normalized.includes('token has expired') || normalized.includes('invalid or expired')) {
    return 'El enlace ya expiró. Solicita uno nuevo para continuar.';
  }
  if (isNetworkErrorMessage(normalized)) {
    return AUTH_OFFLINE_MESSAGE;
  }

  return message.trim();
}

export function buildPasswordResetRedirectUrl(locationLike: {
  origin: string;
  pathname: string;
  search?: string;
}): string {
  const search = locationLike.search ?? '';
  return `${locationLike.origin}${locationLike.pathname}${search}#/auth?mode=reset`;
}
