## MODIFIED Requirements

### Registro — locale y validaciones

- El formulario de registro MUST usar mensajes de validación traducibles (claves i18n), no cadenas fijas solo en español.
- Tras un registro exitoso con email/contraseña, la UI MUST aplicar el locale elegido en el formulario (cookie `dt_locale` y `localStorage.locale`) antes de redirigir al panel.
