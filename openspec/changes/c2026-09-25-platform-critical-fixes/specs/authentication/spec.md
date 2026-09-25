## Delta RF-2 (Google OAuth)

### MODIFIED Criterios de Aceptación

- Tras el callback en `/auth/callback`, el parámetro `next` MUST validarse con allowlist de rutas internas (path relativo que empiece por `/`, sin `//` ni esquema URL). Si es inválido, redirección por defecto a `/dashboard`.
