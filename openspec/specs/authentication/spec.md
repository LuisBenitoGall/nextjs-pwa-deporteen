# Autenticación y Gestión de Usuarios

## Descripción

Sistema de autenticación y gestión de usuarios que permite registro, login, recuperación de contraseña y gestión de perfiles.

## Requisitos Funcionales

### RF-1: Registro de Usuario

**Descripción**: Un usuario puede registrarse en la aplicación proporcionando email y contraseña.

**Criterios de Aceptación**:
- El usuario puede acceder a `/registro`
- Debe proporcionar email válido y contraseña (mínimo 6 caracteres)
- Se crea un perfil de usuario en Supabase Auth
- Se crea un registro en la tabla `users` con el perfil básico
- Se envía email de verificación (si está configurado)
- El usuario es redirigido a `/dashboard` tras registro exitoso

**Flujo**:
1. Usuario accede a `/registro`
2. Completa formulario con email y contraseña
3. Sistema valida datos
4. Se crea cuenta en Supabase Auth
5. Se crea perfil en tabla `users`
6. Redirección a dashboard

### RF-2: Inicio de Sesión

**Descripción**: Usuario autenticado puede iniciar sesión con email/password o OAuth (Google).

**Criterios de Aceptación**:
- El usuario puede acceder a `/login`
- Puede iniciar sesión con email y contraseña
- Puede iniciar sesión con Google OAuth
- Si el usuario está desactivado (`status = false`), se redirige a `/logout`
- Tras login exitoso, se redirige a `/dashboard` o a la URL de `next` si existe
- Se mantiene la sesión mediante cookies

**Flujos**:
- **Email/Password**: 
  1. Usuario ingresa credenciales
  2. Supabase Auth valida
  3. Se establece sesión
  4. Redirección
  
- **Google OAuth**:
  1. Usuario hace clic en "Iniciar con Google"
  2. Redirección a Google
  3. Autorización
  4. Callback a `/auth/callback`
  5. Se crea/actualiza usuario
  6. Redirección

### RF-3: Recuperación de Contraseña

**Descripción**: Usuario puede solicitar restablecimiento de contraseña.

**Criterios de Aceptación**:
- Acceso a `/forgot-password`
- Ingreso de email
- Envío de email con link de restablecimiento
- Acceso a `/auth/reset-password` con token
- Actualización de contraseña

### RF-4: Gestión de Perfil

**Descripción**: Usuario autenticado puede ver y editar su perfil.

**Criterios de Aceptación**:
- Acceso a `/account` (requiere autenticación)
- Visualización de datos del perfil (email, locale, estado de suscripción)
- Edición de preferencias (locale)
- Visualización de suscripciones activas
- Renovación de suscripción

### RF-5: Cierre de Sesión

**Descripción**: Usuario puede cerrar sesión.

**Criterios de Aceptación**:
- Acceso a `/logout` (route handler)
- Se invalida la sesión en Supabase
- Se limpian cookies
- Redirección a página de inicio

## Requisitos No Funcionales

- **Seguridad**: Todas las rutas protegidas verifican autenticación
- **RLS**: Row Level Security en Supabase protege datos de usuarios
- **Sesiones**: Manejo seguro de sesiones mediante cookies HTTP-only
- **Validación**: Validación de inputs en cliente y servidor

## Modelo de Datos

### Tabla `users`
- `id` (UUID, PK, FK a auth.users)
- `locale` (text): Idioma preferido (es-ES, ca-ES, en-US)
- `status` (boolean): Estado activo/inactivo
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Integraciones

- **Supabase Auth**: Autenticación y gestión de sesiones
- **Google OAuth**: Login social (opcional)

## Estados y Flujos

### Estados de Usuario
- **Activo**: `status = true`, puede usar la aplicación
- **Inactivo**: `status = false`, redirigido a logout automáticamente

### Flujo de Autenticación
```
No autenticado → Login/Registro → Autenticado → Dashboard
                                      ↓
                                 Verificación de status
                                      ↓
                              Status activo → Acceso completo
                              Status inactivo → Logout forzado
```

## Casos de Uso

1. **Nuevo usuario se registra**: RF-1
2. **Usuario existente inicia sesión**: RF-2
3. **Usuario olvida contraseña**: RF-3
4. **Usuario edita perfil**: RF-4
5. **Usuario cierra sesión**: RF-5
6. **Admin desactiva usuario**: El usuario es redirigido automáticamente en siguiente request
