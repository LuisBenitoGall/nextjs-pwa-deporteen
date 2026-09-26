## Delta RF-2 (Google OAuth)

### MODIFIED Criterios de Aceptación

- Tras el callback en `/auth/callback`, el parámetro `next` MUST validarse con allowlist de rutas internas (path relativo que empiece por `/`, sin `//` ni esquema URL). Si es inválido, redirección por defecto a `/dashboard`.

## Delta CRIT-12 — Middleware sin credenciales Supabase

### ADDED Criterios de Aceptación

- Si faltan `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_ANON_KEY`, el middleware **no** MUST lanzar error 500 en rutas HTML.
- Comportamiento degradado: aplicar cabeceras CSP/seguridad; rutas `/admin` y rutas protegidas (`/dashboard`, `/players`, `/account`, `/subscription`, `/billing`) redirigen a `/login` con `error=supabase_config` (equivalente a sin sesión); rutas públicas siguen sirviendo la página.
- Con credenciales presentes, el comportamiento de auth existente se mantiene.
