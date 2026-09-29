-- Luis 27/09/2026: marcas email caducidad por umbral + política retención cookie_consents

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS notified_expiry_email jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.subscriptions.notified_expiry_email IS
  'Umbrales (días) de aviso por correo ya enviados para current_period_end; formato { periodEnd, thresholdDays[] }.';

COMMENT ON TABLE public.cookie_consents IS
  'Append-only: decisiones de cookies por usuario o visitante anónimo; sin IP (minimización). Conservación máxima 24 meses desde created_at (purga diaria vía cron con service_role).';
