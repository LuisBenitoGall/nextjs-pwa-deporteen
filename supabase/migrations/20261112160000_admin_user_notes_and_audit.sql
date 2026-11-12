-- Notas internas de admin en usuarios y registro de auditoría de cambios sensibles.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS admin_notes text;

COMMENT ON COLUMN public.users.admin_notes IS
  'Notas internas visibles solo en panel admin (service role / superadmin).';

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_audit_log IS
  'Auditoría de acciones admin (p. ej. cambio de asientos o fin de suscripción).';

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_created
  ON public.admin_audit_log (target_user_id, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
