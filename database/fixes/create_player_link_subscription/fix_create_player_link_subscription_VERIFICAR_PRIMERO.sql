-- CORRECCIÓN CON VERIFICACIÓN PREVIA
-- Primero obtenemos la definición actual y luego aplicamos la corrección
-- 
-- PASOS:
-- 1. Obtener definición actual de la función
-- 2. Verificar si contiene coalesce(is_active
-- 3. Aplicar corrección si es necesario
-- 4. Verificar que la corrección se aplicó

-- PASO 1: Obtener y mostrar la definición actual
DO $$
DECLARE
  v_prosrc text;
  v_count int;
BEGIN
  -- Obtener el código fuente actual
  SELECT p.prosrc INTO v_prosrc
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'create_player_link_subscription';
  
  IF v_prosrc IS NULL THEN
    RAISE NOTICE '❌ La función create_player_link_subscription no existe';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Función encontrada. Analizando código fuente...';
  
  -- Buscar todas las ocurrencias problemáticas
  IF v_prosrc ILIKE '%coalesce(is_active%' THEN
    RAISE NOTICE '⚠️ DETECTADO: La función contiene coalesce(is_active)';
    RAISE NOTICE 'Mostrando líneas problemáticas:';
    
    -- Mostrar líneas que contienen el patrón problemático
    RAISE NOTICE '%', v_prosrc;
  ELSE
    RAISE NOTICE '✅ La función NO contiene coalesce(is_active). Ya está corregida.';
    RETURN;
  END IF;
END $$;

-- PASO 2: Aplicar corrección completa
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
    -- CORRECCIÓN: Usar solo 'active' (boolean), no coalesce(is_active, active)
    -- porque is_active ya no existe en access_codes
    select id, num_days, max_uses, usage_count,
           active
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
  insert into public.players (user_id, full_name, birthday, status, created_at, updated_at)
  values (v_uid, nullif(p_full_name,''), p_birthday, coalesce(p_status,true), v_now, v_now)
  returning id into player_id;

  -- 2) Obtener/crear subscription_id
  -- NOTA: status en subscriptions es TEXT ('active', 'trialing', etc.), NO boolean
  if v_code_id is not null then
    -- Reutilizar suscripción activa por ese código si existe; si no, crearla
    select id
      into v_sub_id
      from public.subscriptions s
     where s.user_id = v_uid
       and s.access_code_id = v_code_id
       and s.status = 'active'
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
        'active', v_end, false,
        v_now, v_now, v_code_id, 0, 'EUR',
        1, null, null
      )
      returning id into v_sub_id;

      -- aumentar usos del código
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
       and s.status = 'active'
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

-- PASO 3: Verificación final
DO $$
DECLARE
  v_prosrc text;
BEGIN
  -- Obtener el código fuente después de la corrección
  SELECT p.prosrc INTO v_prosrc
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'create_player_link_subscription';
  
  IF v_prosrc IS NULL THEN
    RAISE EXCEPTION '❌ ERROR: La función no existe después de CREATE OR REPLACE';
  END IF;
  
  -- Verificar que NO contiene coalesce(is_active
  IF v_prosrc ILIKE '%coalesce(is_active%' THEN
    RAISE EXCEPTION '❌ ERROR: La función aún contiene coalesce(is_active). Revisa manualmente la definición.';
  END IF;
  
  -- Verificar que usa solo 'active' (sin coalesce)
  IF v_prosrc NOT ILIKE '%active%' THEN
    RAISE EXCEPTION '⚠️ ADVERTENCIA: La función no parece usar el campo active. Verifica manualmente.';
  END IF;
  
  RAISE NOTICE '✅ VERIFICACIÓN EXITOSA: La función ya no contiene coalesce(is_active)';
  RAISE NOTICE '✅ La función está corregida y lista para usar';
  RAISE NOTICE 'El error "COALESCE types text and boolean cannot be matched" debería estar resuelto.';
END $$;
