-- CORRECCIÓN: Violación de constraint UNIQUE en subscriptions
-- Error: duplicate key value violates unique constraint "subscriptions_user_id_unique"
-- 
-- PROBLEMA: La función intenta crear una suscripción cuando ya existe una para ese user_id
-- SOLUCIÓN: Usar INSERT ... ON CONFLICT o verificar mejor antes de insertar

-- PASO 1: Eliminar la función existente
DROP FUNCTION IF EXISTS public.create_player_link_subscription(text, date, boolean, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_player_link_subscription(p_full_name text, p_birthday date, p_status boolean, p_code_text text) CASCADE;

-- PASO 2: Crear la función corregida con manejo de conflictos
CREATE FUNCTION public.create_player_link_subscription(
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
  v_active_flag bool;
  v_sub_id uuid;
  v_end timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- 0) Si llega código, validarlo y reservar
  if p_code_text is not null and length(trim(p_code_text)) > 0 then
    select id, num_days, max_uses, usage_count,
           active
      into v_code_id, v_num_days, v_max_uses, v_usage_count, v_active_flag
      from public.access_codes
     where code = trim(p_code_text)
     for update;

    if v_code_id is null or not v_active_flag then
      raise exception 'suscripcion_codigo_error';
    end if;
    if v_max_uses is not null and v_usage_count is not null
       and v_usage_count >= v_max_uses then
      raise exception 'suscripcion_codigo_error';
    end if;
  end if;

  -- 1) Crear jugador
  insert into public.players (user_id, full_name, birthday, status, created_at, updated_at)
  values (v_uid, nullif(p_full_name,''), p_birthday, coalesce(p_status,true), v_now, v_now)
  returning id into player_id;

  -- 2) Obtener/crear subscription_id
  if v_code_id is not null then
    -- CORRECCIÓN: Buscar suscripción existente más ampliamente
    -- Primero buscar por user_id + access_code_id
    select id
      into v_sub_id
      from public.subscriptions s
     where s.user_id = v_uid
       and s.access_code_id = v_code_id
       and s.status = 'active'
       and (s.current_period_end is null or s.current_period_end > v_now)
     order by s.current_period_end desc nulls last
     limit 1;

    -- Si no existe, buscar cualquier suscripción activa del usuario
    if v_sub_id is null then
      select id
        into v_sub_id
        from public.subscriptions s
       where s.user_id = v_uid
         and s.status = 'active'
         and (s.current_period_end is null or s.current_period_end > v_now)
       order by s.current_period_end desc nulls last
       limit 1;
    end if;

    -- Si aún no existe, crear una nueva
    -- CORRECCIÓN: Usar INSERT ... ON CONFLICT para manejar el constraint UNIQUE
    if v_sub_id is null then
      v_end := v_now + make_interval(days => coalesce(v_num_days, 730));
      
      -- Intentar insertar, si falla por UNIQUE, obtener la existente
      begin
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
        
        -- Actualizar usage_count solo si se creó nueva suscripción
        update public.access_codes
           set usage_count = coalesce(usage_count,0) + 1
         where id = v_code_id;
         
      exception when unique_violation then
        -- Si ya existe una suscripción para este user_id, obtenerla
        select id
          into v_sub_id
          from public.subscriptions s
         where s.user_id = v_uid
           and s.status = 'active'
         order by s.current_period_end desc nulls last
         limit 1;
         
        if v_sub_id is null then
          raise exception 'no_active_subscription';
        end if;
      end;
    end if;

    subscription_id := v_sub_id;

  else
    -- Sin código: buscar suscripción activa existente
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

  -- 3) Enlace en subscription_players (usar ON CONFLICT para evitar duplicados)
  insert into public.subscription_players (
    subscription_id, player_id, access_code_id,
    amount_cents, currency, source, linked_at, created_at
  ) values (
    subscription_id, player_id, v_code_id,
    0, 'EUR', case when v_code_id is not null then 'code' else 'stripe' end,
    v_now, v_now
  )
  on conflict (subscription_id, player_id) do nothing;

  return next;
end;
$$;
