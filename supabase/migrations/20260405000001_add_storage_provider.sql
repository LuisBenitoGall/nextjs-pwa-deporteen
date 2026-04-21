-- ============================================================
-- Storage provider support
-- ============================================================
-- match_media: proveedor de almacenamiento + id de Google Drive
ALTER TABLE match_media
    ADD COLUMN IF NOT EXISTS storage_provider text
        CHECK (storage_provider IN ('local','supabase','drive','r2'))
        DEFAULT 'local',
    ADD COLUMN IF NOT EXISTS google_drive_file_id text;

-- profiles: proveedor por defecto del usuario
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS media_provider text
        CHECK (media_provider IN ('local','supabase','drive','r2'))
        DEFAULT 'local';

-- ============================================================
-- R2 storage plans (tiers de almacenamiento)
-- ============================================================
CREATE TABLE IF NOT EXISTS storage_plans (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    name_key        text,                    -- clave i18n
    gb_amount       integer NOT NULL,        -- GB incluidos
    amount_cents    bigint NOT NULL,         -- precio en céntimos
    currency        text NOT NULL DEFAULT 'EUR',
    stripe_price_id text,
    active          boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Tiers de ejemplo (precios en céntimos: 1690 = €16.90, 4690 = €46.90, 9990 = €99.90)
INSERT INTO storage_plans (name, name_key, gb_amount, amount_cents, currency, active)
VALUES
    ('Básico',      'storage_plan_basico',   10,  1690,  'EUR', true),
    ('Estándar',    'storage_plan_estandar',50,  4690, 'EUR', true),
    ('Pro',         'storage_plan_pro',     200, 9990, 'EUR', true);

-- RLS: solo lectura pública para los planes activos
ALTER TABLE storage_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "storage_plans_public_read"
    ON storage_plans FOR SELECT USING (active = true);

-- ============================================================
-- R2 storage subscriptions por usuario
-- ============================================================
CREATE TABLE IF NOT EXISTS storage_subscriptions (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id                     uuid REFERENCES storage_plans(id),
    gb_amount                   integer NOT NULL,
    amount_cents                bigint NOT NULL,
    currency                    text NOT NULL DEFAULT 'EUR',
    status                      text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','expired','cancelled')),
    current_period_start        timestamptz NOT NULL DEFAULT now(),
    current_period_end          timestamptz NOT NULL,
    stripe_customer_id          text,
    stripe_payment_intent_id    text UNIQUE,  -- idempotencia
    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id)  -- una suscripción activa por usuario (upsert)
);

ALTER TABLE storage_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "storage_subscriptions_owner"
    ON storage_subscriptions FOR ALL
    USING (user_id = auth.uid());

-- Índice para consultas de expiración
CREATE INDEX IF NOT EXISTS idx_storage_subs_user
    ON storage_subscriptions (user_id, current_period_end DESC);
