-- CORRECCIÓN DIRECTA: create_player_link_subscription
-- Corrige múltiples errores identificados basándose en el schema real verificado
--
-- CORRECCIONES APLICADAS:
-- 1. coalesce(is_active, active) → active (COALESCE types text and boolean cannot be matched)
-- 2. status en subscriptions es TEXT ('active'), no boolean (coalesce(s.status, false) = true → s.status = 'active')
-- 3. Verificación de nombres de columnas según schema real verificado

CREATE OR REPLACE FUNCTION public.create_player_link_subscription(
  p_full_name text,
  p_birthday date DEFAULT NULL,
  p_status boolean DEFAULT true,
  p_code_text text DEFAULT NULL
)
RETURNS TABLE(player_id uuid, subscription_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_code_id uuid;
  v_num_days int;
  v_max_uses int;
  v_usage_count int;
  v_active bool;
  v_sub_id uuid;
  v_end timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- 0) Si llega código, validarlo y reservar
  if p_code_text is not null and length(trim(p_code_text)) > 0 then
    -- CORRECCIÓN: Cambiar coalesce(is_active, active) por solo active
    -- ya que is_active fue eliminado y solo existe active (boolean)
    select id, num_days, max_uses, usage_count,
           active as active_flag
      into v_code_id, v_num_days, v_max_uses, v_usage_count, v_active
      from public.access_codes
     where code = trim(p_code_text)
     for update;

    if v_code_id is null or not v_active then
      raise exception 'suscripcion_codigo_error';
    end if;
    if v_max_uses is not null and v_usage_count is not null
       and v_usage_count >= v_max_uses then
      raise exception 'suscripcion_codigo_error'; -- agotado
    end if;
  end if;

  -- 1) Crear jugador
  -- NOTA: La tabla players usa user_id (no owner_id) según schema real verificado
  -- NOTA: status es boolean según schema real
  insert into public.players (user_id, full_name, birthday, status, created_at, updated_at)
  values (v_uid, nullif(p_full_name,''), p_birthday, coalesce(p_status,true), v_now, v_now)
  returning id into player_id;

  -- 2) Obtener/crear subscription_id
  -- NOTA CRÍTICA: status en subscriptions es TEXT ('active', 'trialing', etc.), NO boolean
  if v_code_id is not null then
    -- Reutilizar suscripción activa por ese código si existe; si no, crearla
    select id
      into v_sub_id
      from public.subscriptions s
     where s.user_id = v_uid
       and s.access_code_id = v_code_id
       and s.status = 'active'  -- CORRECCIÓN: status es text, no boolean
       and (s.current_period_end is null or s.current_period_end > v_now)
     order by s.current_period_end desc nulls last
     limit 1;

    if v_sub_id is null then
      v_end := v_now + make_interval(days => coalesce(v_num_days, 730));
      insert into public.subscriptions (
        user_id, stripe_customer_id, stripe_subscription_id,
        status, current_period_end, cancel_at_period_end,
        created_at, updated_at, access_code_id, amount, currency,
        seats, notified_expiry_7d_at, plan_id
      ) values (
        v_uid, null, null,
        'active', v_end, false,  -- CORRECCIÓN: status debe ser 'active' (text), no true (boolean)
        v_now, v_now, v_code_id, 0, 'EUR',
        1, null, null
      )
      returning id into v_sub_id;

      -- aumentar usos del código
      -- NOTA: El campo se llama 'usage_count' (no 'used_count')
      update public.access_codes
         set usage_count = coalesce(usage_count,0) + 1
       where id = v_code_id;
    end if;

    subscription_id := v_sub_id;

  else
    -- Sin código: exigir suscripción activa existente del usuario
    select id
      into v_sub_id
      from public.subscriptions s
     where s.user_id = v_uid
       and s.status = 'active'  -- CORRECCIÓN: status es text, no boolean
       and (s.current_period_end is null or s.current_period_end > v_now)
     order by s.current_period_end desc nulls last
     limit 1;

    if v_sub_id is null then
      raise exception 'no_active_subscription';
    end if;

    subscription_id := v_sub_id;
  end if;

  -- 3) Enlace en subscription_players
  insert into public.subscription_players (
    subscription_id, player_id, access_code_id,
    amount_cents, currency, source, linked_at, created_at
  ) values (
    subscription_id, player_id, v_code_id,
    0, 'EUR', case when v_code_id is not null then 'code' else 'stripe' end,
    v_now, v_now
  );

  return next;
end;
$$;

-- Verificar que la corrección se aplicó
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'create_player_link_subscription'
      AND COALESCE(p.prosrc, '') ILIKE '%coalesce(is_active%'
  ) THEN
    RAISE EXCEPTION '❌ La función aún contiene coalesce(is_active, active). Revisa la corrección.';
  ELSE
    RAISE NOTICE '✅ Verificación exitosa: La función ya no contiene coalesce(is_active, active).';
    RAISE NOTICE 'El error "COALESCE types text and boolean cannot be matched" debería estar resuelto.';
  END IF;
END $$;
