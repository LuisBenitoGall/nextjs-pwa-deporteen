-- Fix Security Advisor: SECURITY DEFINER view on public.player_active_access
-- 1) Allow authenticated users to SELECT only their own rows on access_code_usages
--    (required before security_invoker; otherwise RLS blocks all rows for clients).
-- 2) Recreate the view with security_invoker so checks use the querying user.

CREATE POLICY "acu_sel_own"
ON public.access_code_usages
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE VIEW public.player_active_access
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (u.player_id)
  u.player_id,
  u.user_id,
  u.code_id,
  u.created_at AS assigned_at
FROM public.access_code_usages u
JOIN public.access_codes c ON c.id = u.code_id
WHERE u.player_id IS NOT NULL
  AND (c.active IS TRUE OR c.active IS NULL)
ORDER BY u.player_id, u.created_at DESC;
