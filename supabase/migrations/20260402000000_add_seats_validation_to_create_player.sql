-- Migration: add atomic seats validation inside create_player_link_subscription
-- Before this fix, the only seat check was client-side (race condition: two tabs
-- could bypass it). Now the database enforces the limit transactionally.

CREATE OR REPLACE FUNCTION public.create_player_link_subscription(
  p_full_name text,
  p_birthday  date    DEFAULT NULL::date,
  p_status    boolean DEFAULT true,
  p_code_text text    DEFAULT NULL::text
)
RETURNS TABLE(player_id uuid, subscription_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_uid          uuid        := auth.uid();
  v_now          timestamptz := now();
  v_code_id      uuid;
  v_num_days     int;
  v_max_uses     int;
  v_usage_count  int;
  v_active_flag  bool;
  v_sub_id       uuid;
  v_end          timestamptz;
  v_player_id    uuid;
  v_subscription_id uuid;
  v_used_seats   int;
  v_max_seats    int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- 0) Si llega código, validarlo
  if p_code_text is not null and length(trim(p_code_text)) > 0 then
    select id, num_days, max_uses, usage_count, active
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

  -- 2) Obtener suscripción activa existente
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
           set usage_count = coalesce(usage_count, 0) + 1
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

  -- 3b) Validación atómica de plazas disponibles
  -- Leemos seats con FOR UPDATE para bloquear la fila y evitar la race condition.
  select seats into v_max_seats
    from public.subscriptions
   where id = v_subscription_id
   for update;

  select count(*) into v_used_seats
    from public.subscription_players sp
   where sp.subscription_id = v_subscription_id;

  if v_max_seats is not null and v_used_seats >= v_max_seats then
    raise exception 'no_seats_available';
  end if;

  -- 4) Enlace en subscription_players
  if not exists (
    select 1
      from public.subscription_players sp
     where sp.subscription_id = v_subscription_id
       and sp.player_id = v_player_id
  ) then
    insert into public.subscription_players (
      subscription_id, player_id, access_code_id,
      amount_cents, currency, source, linked_at, created_at
    ) values (
      v_subscription_id,
      v_player_id,
      v_code_id,
      0, 'EUR',
      case when v_code_id is not null then 'code' else 'stripe' end,
      v_now, v_now
    );
  end if;

  -- 5) Retornar
  return query
  select v_player_id, v_subscription_id;

end;
$function$;
