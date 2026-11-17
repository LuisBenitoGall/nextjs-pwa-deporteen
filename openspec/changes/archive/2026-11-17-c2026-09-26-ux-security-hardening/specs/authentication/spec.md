## Delta — Autenticación

### RF-2 (modificado)

**Criterios de Aceptación** (añadir):

- Las rutas bajo `/matches` y `/gallery` requieren sesión (middleware), igual que `/dashboard` y `/players`.
- Si `users.status` es `false`, cualquier ruta protegida redirige a `/logout` para invalidar sesión local.

### RF-5 (modificado)

**Criterios de Aceptación** (añadir):

- El route handler `/logout` invoca `supabase.auth.signOut()` en servidor antes de limpiar cookies.
- La redirección post-logout usa `NEXT_PUBLIC_APP_URL` si está definida; si no, el origen de la petición HTTP.

### Nuevo — RF-6: Mensajes de acceso denegado

**Descripción**: El usuario entiende por qué no puede acceder a una zona.

**Criterios de Aceptación**:

- Tras intento de acceso admin sin permiso (`?error=forbidden` en `/`), la home muestra un aviso visible (no solo query oculta).
- Tras borrado fallido o exitoso vía server action, la página destino muestra banner traducible (`actionOk` / `actionError`).
