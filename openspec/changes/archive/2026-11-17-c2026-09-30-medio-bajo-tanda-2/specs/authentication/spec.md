## MODIFIED Requirements

### RF-7 — Errores de autenticación coherentes

**Criterios de aceptación**:

- Login, callback OAuth, recuperación y restablecimiento de contraseña muestran mensajes traducibles y al menos un CTA claro (reintentar login, recuperar contraseña o volver al inicio) según el tipo de fallo.
- El query `error=supabase_config` en login muestra mensaje de configuración sin pantalla genérica de Next.
