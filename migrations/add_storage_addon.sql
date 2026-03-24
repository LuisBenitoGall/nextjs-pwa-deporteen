-- migrations/add_storage_addon.sql
-- Tabla para registrar qué usuarios tienen activo el add-on de Cloudflare R2 Storage.
-- Se actualiza automáticamente desde el webhook de Stripe (stripe/webhooks/route.ts).

CREATE TABLE IF NOT EXISTS public.storage_addons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'inactive', -- 'active' | 'inactive' | 'trialing'
  stripe_price_id TEXT,                              -- Price ID del add-on en Stripe
  stripe_charge_id TEXT,                             -- charge/payment_intent confirmado
  activated_at    TIMESTAMPTZ,                       -- cuándo se activó
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)                                    -- un usuario = un registro
);

-- Índice para las consultas del guard (hasStorageAddon)
CREATE INDEX IF NOT EXISTS idx_storage_addons_user_status
  ON public.storage_addons(user_id, status);

-- RLS: solo el propio usuario puede ver su add-on (el backend usa service_role)
ALTER TABLE public.storage_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own storage addon"
  ON public.storage_addons FOR SELECT
  USING (auth.uid() = user_id);

-- Solo el service_role (backend) puede insertar/actualizar
-- (el webhook de Stripe llama con SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY "Service role can manage storage addons"
  ON public.storage_addons FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_storage_addons_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER storage_addons_updated_at
  BEFORE UPDATE ON public.storage_addons
  FOR EACH ROW EXECUTE FUNCTION update_storage_addons_updated_at();
