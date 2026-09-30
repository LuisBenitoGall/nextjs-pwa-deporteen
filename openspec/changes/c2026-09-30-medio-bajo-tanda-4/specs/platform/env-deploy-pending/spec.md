## Inventario — Despliegue (CRIT-12, post Medio/Bajo)

**No implementado en este change.** Pendiente para Luis antes de staging/prod:

| Variable / secreto | Uso |
|--------------------|-----|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente y middleware SSR |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin server |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs en BD | Pagos |
| `RESEND_API_KEY` (o SMTP) | Email transaccional |
| R2 / Drive (según proveedor) | Medios remotos |
| `NEXT_PUBLIC_APP_URL` | Redirects logout/checkout |

Modo degradado en middleware para rutas públicas sin env: **pendiente de change dedicado** (CRIT-12).
