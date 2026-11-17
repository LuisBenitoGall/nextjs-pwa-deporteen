# Tareas — retención, purga y cron

- [x] Migración `20260927180000_consent_retention_and_expiry_email.sql`
- [x] Purga en `@/lib/cookie-consent` + cron `runDailyMaintenanceCron`
- [x] Vercel Cron `/api/cron/daily` + `CRON_SECRET`
- [x] Email Resend + plantilla i18n + `notified_expiry_email`
- [x] Textos privacidad 24 meses (es base + `pnpm i18n:sync`)
- [x] Tests umbrales, email state, retención
- [ ] Luis: env Vercel + verificar correo en staging (no verificable en VM agente)
