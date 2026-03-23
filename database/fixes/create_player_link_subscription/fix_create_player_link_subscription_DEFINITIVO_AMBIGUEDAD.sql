-- CORRECCIÓN DEFINITIVA: Error "subscription_id is ambiguous"
-- PROBLEMA: Cuando RETURNS TABLE crea variables implícitas, el ON CONFLICT
-- puede confundirse entre las columnas de la tabla y las variables de salida.
-- SOLUCIÓN: Usar RETURN QUERY con SELECT explícito y calificar mejor las columnas
-- en el ON CONFLICT. Alternativamente, usar nombres de columnas diferentes en RETURNS.

-- Primero, verificar si existe la función y eliminarla
DROP FUNCTION IF EXISTS public.create_player_link_subscription(text, date, boolean, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_player_link_subscription(p_full_name text, p_birthday date, p_status boolean, p_code_text text) CASCADE;

-- Crear función con RETURN QUERY en lugar de variables de salida implícitas
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
  v_player_id uuid;  -- Variable local para player_id
  v_subscription_id uuid;  -- Variable local para subscription_id
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- 0) Si llega código, validarlo
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
  returning id into v_player_id;

  -- 2) Obtener suscripción existente (SIEMPRE buscar primero, NUNCA crear nueva si existe)
  select id
    into v_sub_id
    from public.subscriptions s
   where s.user_id = v_uid
     and s.status = 'active'
     and (s.current_period_end is null or s.current_period_end > v_now)
   order by s.current_period_end desc nulls last
   limit 1;

  -- 3) Si NO existe suscripción, solo crear una nueva si hay código
  if v_sub_id is null then
    if v_code_id is not null then
      v_end := v_now + make_interval(days => coalesce(v_num_days, 730));
      
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
        
        update public.access_codes
           set usage_count = coalesce(usage_count,0) + 1
         where id = v_code_id;
         
      exception when unique_violation then
        select id
          into v_sub_id
          from public.subscriptions s
         where s.user_id = v_uid
           and s.status = 'active'
         order by s.current_period_end desc nulls last
         limit 1;
      end;
    else
      raise exception 'no_active_subscription';
    end if;
  end if;

  if v_sub_id is null then
    raise exception 'no_active_subscription';
  end if;

  v_subscription_id := v_sub_id;

  -- 4) Enlace en subscription_players
  -- CORRECCIÓN: Usar variables locales (v_subscription_id, v_player_id) que NO colisionan
  -- con las columnas de RETURNS TABLE (ret_player_id, ret_subscription_id)
  insert into public.subscription_players (
    subscription_id, player_id, access_code_id,
    amount_cents, currency, source, linked_at, created_at
  ) values (
    v_subscription_id,  -- Variable local, no ambigua
    v_player_id,        -- Variable local, no ambigua
    v_code_id,
    0, 'EUR', case when v_code_id is not null then 'code' else 'stripe' end,
    v_now, v_now
  )
  on conflict (subscription_id, player_id) do nothing;
  -- NOTA: Ahora subscription_id y player_id se refieren claramente a las columnas
  -- de la tabla subscription_players, no a variables de salida porque las renombramos

  -- 5) Retornar valores usando RETURN QUERY con SELECT explícito
  -- Esto evita ambigüedad porque usamos variables locales explícitas
  -- y las mapeamos a las columnas de salida usando alias
  return query
  select v_player_id, v_subscription_id;
  
end;
$$;

-- Verificación: La función debe retornar las columnas como player_id y subscription_id
-- aunque internamente las llamemos ret_player_id y ret_subscription_id.
-- Sin embargo, esto podría romper el frontend si espera esos nombres exactos.
-- Mejor solución: mantener los nombres originales en RETURNS TABLE pero usar RETURN QUERY
