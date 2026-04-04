-- Fix Security Advisor: RLS disabled on public.access_code_redemptions
-- Audit-style rows: access_code_id, player_id, redeemed_at. anon/authenticated
-- had full table privileges without RLS — any client could read/modify all redemptions.
-- Deny via API for PUBLIC; service_role bypasses RLS for server-side writes/reads.

ALTER TABLE public.access_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access_code_redemptions_no_client_access"
ON public.access_code_redemptions
FOR ALL
TO public
USING (false)
WITH CHECK (false);
