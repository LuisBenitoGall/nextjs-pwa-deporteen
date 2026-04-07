-- Security Advisor (warnings batch):
-- 0011_function_search_path_mutable — pin search_path so object resolution cannot be hijacked.
-- 0024_permissive_rls_policy — drop ac_upd_usage (UPDATE true/true for all authenticated rows).
--   Updates to usage_count run inside SECURITY DEFINER public.redeem_access_code; direct client
--   UPDATE on access_codes is not used in the app and was overly permissive.

-- -----------------------------------------------------------------------------
-- RLS: access_codes
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS ac_upd_usage ON public.access_codes;

-- -----------------------------------------------------------------------------
-- Functions: immutable search_path (lint 0011)
-- -----------------------------------------------------------------------------

ALTER FUNCTION public._calc_start_for_player(uuid, uuid) SET search_path = public;
ALTER FUNCTION public._matches_validate_stats() SET search_path = public;
ALTER FUNCTION public._validate_membership_consistency() SET search_path = public;
ALTER FUNCTION public.assign_credit_to_player(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.assign_credit_to_player(uuid, uuid, uuid) SET search_path = public;
ALTER FUNCTION public.cmp_lock_player_id() SET search_path = public;
ALTER FUNCTION public.create_code_subscription(text, uuid, uuid) SET search_path = public;
ALTER FUNCTION public.create_player_link_subscription(text, date, boolean, text) SET search_path = public;
ALTER FUNCTION public.enforce_license_owner() SET search_path = public;
ALTER FUNCTION public.enforce_subscription_capacity() SET search_path = public;
ALTER FUNCTION public.ensure_profile(uuid, text, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.fn_sync_user_from_auth() SET search_path = public;
ALTER FUNCTION public.mm_lock_user_id() SET search_path = public;
ALTER FUNCTION public.players_set_owner() SET search_path = public;
ALTER FUNCTION public.preview_code(text) SET search_path = public;
ALTER FUNCTION public.ps_lock_player_id() SET search_path = public;
ALTER FUNCTION public.redeem_access_code(text, uuid) SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.storage_set_owner() SET search_path = public;
ALTER FUNCTION public.tg_set_timestamps() SET search_path = public;
