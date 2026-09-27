-- Registro auditable de consentimientos de cookies (banner / panel PWA)
CREATE TABLE IF NOT EXISTS public.cookie_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  device_id text,
  consent_version text NOT NULL,
  choices jsonb NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cookie_consents_choices_object CHECK (jsonb_typeof(choices) = 'object'),
  CONSTRAINT cookie_consents_necesarias_true CHECK (COALESCE((choices ->> 'necesarias')::boolean, false) = true)
);

COMMENT ON TABLE public.cookie_consents IS
  'Append-only: decisiones de cookies por usuario o visitante anónimo; sin IP (minimización).';

CREATE INDEX IF NOT EXISTS idx_cookie_consents_user_created
  ON public.cookie_consents (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cookie_consents_created_at
  ON public.cookie_consents (created_at DESC);

ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

-- Usuario autenticado: insertar solo como sí mismo
CREATE POLICY cookie_consents_insert_authenticated
  ON public.cookie_consents
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

CREATE POLICY cookie_consents_select_own
  ON public.cookie_consents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Visitante anónimo: insertar sin user_id
CREATE POLICY cookie_consents_insert_anon
  ON public.cookie_consents
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

GRANT INSERT ON TABLE public.cookie_consents TO anon;
GRANT INSERT, SELECT ON TABLE public.cookie_consents TO authenticated;
