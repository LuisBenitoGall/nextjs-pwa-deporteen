-- Idempotencia de concesión de acceso tras Stripe Checkout (pagos únicos deportistas)
CREATE TABLE IF NOT EXISTS public.stripe_checkout_fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_checkout_session_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stripe_checkout_fulfillments_session_unique UNIQUE (stripe_checkout_session_id)
);

CREATE INDEX IF NOT EXISTS stripe_checkout_fulfillments_user_id_idx
  ON public.stripe_checkout_fulfillments (user_id);

COMMENT ON TABLE public.stripe_checkout_fulfillments IS
  'Una fila por checkout.session completado; evita duplicar asientos entre webhook y confirm-session.';
