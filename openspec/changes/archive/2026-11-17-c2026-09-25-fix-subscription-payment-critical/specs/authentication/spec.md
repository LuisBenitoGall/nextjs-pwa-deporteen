# Delta — Autenticación

## MODIFIED Requirements

### RF-1: Registro de Usuario

- `signUp` MUST incluir `emailRedirectTo` hacia `/auth/callback` con destino interno por defecto `/dashboard`.

### RF-2: Inicio de Sesión

- Tras login email/password MUST redirigir a `next` cuando sea un path interno seguro; en caso contrario `/dashboard`.
- OAuth MUST propagar el mismo `next` codificado al callback.

## ADDED Requirements

### Requirement: Pantalla revisar correo

`/auth/check-email` MUST mostrar textos i18n y enlaces a login e inicio.

### Requirement: Traducciones auth críticas

Claves usadas en reset-password y check-email MUST existir en los JSON de mensajes; `makeT` MUST devolver cadena vacía para claves ausentes para permitir fallbacks en UI.
