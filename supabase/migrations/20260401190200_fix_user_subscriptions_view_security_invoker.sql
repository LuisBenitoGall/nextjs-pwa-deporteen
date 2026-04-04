-- Fix Security Advisor: SECURITY DEFINER default on public.user_subscriptions
-- View aggregates public.player_licenses by user_id. Base table RLS (pl_all):
--   auth.uid() = user_id
-- With security_invoker, each caller only sees aggregates built from their own
-- license rows. SECURITY DEFINER previously evaluated as view owner and could
-- bypass RLS, exposing all users' subscription summaries to any client SELECT.

CREATE OR REPLACE VIEW public.user_subscriptions
WITH (security_invoker = true)
AS
SELECT
  user_id,
  CASE
    WHEN max(ends_at) FILTER (WHERE status = 'active'::text) > now() THEN 'active'::text
    ELSE 'none'::text
  END AS status,
  max(ends_at) FILTER (WHERE status = 'active'::text) AS current_period_end
FROM public.player_licenses
GROUP BY user_id;
