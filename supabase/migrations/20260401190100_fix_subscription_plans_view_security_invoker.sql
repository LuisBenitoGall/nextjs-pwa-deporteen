-- Fix Security Advisor: SECURITY DEFINER default on public.subscription_plans_view
-- Underlying public.subscription_plans already has RLS:
--   - SELECT for public: active = true (permissive OR with block-all policy yields active rows only)
-- security_invoker applies those checks as the querying user (anon/authenticated).

CREATE OR REPLACE VIEW public.subscription_plans_view
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  days,
  amount_cents AS price_cents,
  upper(currency) AS currency,
  active,
  free,
  stripe_price_id,
  created_at
FROM public.subscription_plans;
