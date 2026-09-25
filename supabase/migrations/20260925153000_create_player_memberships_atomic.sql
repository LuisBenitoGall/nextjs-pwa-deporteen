-- Decisión Luis 3-A: club, equipo y competición en la misma transacción que el alta de jugador.
-- Decisión Luis 2-A: equipo obligatorio en cada membership.

CREATE OR REPLACE FUNCTION public.create_player_link_subscription(
  p_full_name text,
  p_birthday  date    DEFAULT NULL::date,
  p_status    boolean DEFAULT true,
  p_code_text text    DEFAULT NULL::text,
  p_season_id uuid    DEFAULT NULL::uuid,
  p_memberships jsonb DEFAULT NULL::jsonb
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
  v_item         jsonb;
  v_sport_id     uuid;
  v_comp_name    text;
  v_club_name    text;
  v_team_name    text;
  v_category_id  uuid;
  v_club_id      uuid;
  v_team_id      uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

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

  insert into public.players (user_id, full_name, birthday, status, created_at, updated_at)
  values (v_uid, nullif(p_full_name,''), p_birthday, coalesce(p_status,true), v_now, v_now)
  returning id into v_player_id;

  select id into v_sub_id
    from public.subscriptions s
   where s.user_id = v_uid
     and s.status = 'active'
     and (s.current_period_end is null or s.current_period_end > v_now)
   order by s.current_period_end desc nulls last
   limit 1;

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
        select id into v_sub_id
          from public.subscriptions s
         where s.user_id = v_uid and s.status = 'active'
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

  select seats into v_max_seats from public.subscriptions where id = v_subscription_id for update;
  select count(*) into v_used_seats from public.subscription_players sp where sp.subscription_id = v_subscription_id;

  if v_max_seats is not null and v_used_seats >= v_max_seats then
    raise exception 'no_seats_available';
  end if;

  if not exists (
    select 1 from public.subscription_players sp
     where sp.subscription_id = v_subscription_id and sp.player_id = v_player_id
  ) then
    insert into public.subscription_players (
      subscription_id, player_id, access_code_id,
      amount_cents, currency, source, linked_at, created_at
    ) values (
      v_subscription_id, v_player_id, v_code_id,
      0, 'EUR',
      case when v_code_id is not null then 'code' else 'stripe' end,
      v_now, v_now
    );
  end if;

  if p_memberships is not null and jsonb_typeof(p_memberships) = 'array' and jsonb_array_length(p_memberships) > 0 then
    if p_season_id is null then
      raise exception 'season_required';
    end if;

    for v_item in select * from jsonb_array_elements(p_memberships)
    loop
      v_sport_id := (v_item->>'sport_id')::uuid;
      v_comp_name := nullif(trim(v_item->>'competition_name'), '');
      v_club_name := nullif(trim(v_item->>'club_name'), '');
      v_team_name := nullif(trim(v_item->>'team_name'), '');
      v_category_id := nullif(v_item->>'category_id', '')::uuid;

      if v_sport_id is null then
        raise exception 'membership_sport_required';
      end if;
      if v_comp_name is null then
        raise exception 'membership_competition_required';
      end if;
      if v_team_name is null then
        raise exception 'membership_team_required';
      end if;
      if v_club_name is null then
        raise exception 'membership_club_required';
      end if;

      insert into public.clubs (name, player_id)
      values (v_club_name, v_player_id)
      on conflict (player_id, name) do update set name = excluded.name
      returning id into v_club_id;

      insert into public.teams (name, club_id, sport_id, player_id)
      values (v_team_name, v_club_id, v_sport_id, v_player_id)
      on conflict (player_id, club_id, sport_id, name) do update set name = excluded.name
      returning id into v_team_id;

      insert into public.competitions (
        player_id, season_id, sport_id, club_id, team_id, category_id, name
      ) values (
        v_player_id, p_season_id, v_sport_id, v_club_id, v_team_id, v_category_id, v_comp_name
      );
    end loop;
  end if;

  return query select v_player_id, v_subscription_id;
end;
$function$;
