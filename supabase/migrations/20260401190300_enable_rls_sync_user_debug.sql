-- Fix Security Advisor: RLS disabled on public.sync_user_debug (PostgREST-exposed schema)
-- Table holds debug sync data (email, err, payload). anon/authenticated had full table
-- privileges without RLS — any client could read/write all rows.
-- RLS + explicit deny for PUBLIC; service_role and other BYPASSRLS roles remain usable
-- for server-side tooling (Supabase service role bypasses RLS).

ALTER TABLE public.sync_user_debug ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_user_debug_no_client_access"
ON public.sync_user_debug
FOR ALL
TO public
USING (false)
WITH CHECK (false);
