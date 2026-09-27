--
-- PostgreSQL database dump
--

\restrict h1WeScd4Z1Yw1ucRN5XLnqVNhPViHj9WsGCnLQwU88bfBrdnFPb9qCtfykd22Of

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11 (Ubuntu 17.11-1.pgdg24.04+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- (CREATE SCHEMA public omitido: ya existe en Postgres/Supabase; el bootstrap no recrea public.)

--
-- Name: _calc_start_for_player(uuid, uuid); Type: FUNCTION; Schema: -; Owner: -
--

CREATE FUNCTION public._calc_start_for_player(p_user uuid, p_player uuid) RETURNS timestamp with time zone
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  with last as (
    select ends_at
    from public.player_entitlements
    where user_id = p_user and player_id = p_player
    order by ends_at desc
    limit 1
  )
  select coalesce(
    (select ends_at + interval '1 day' from last),
    now()
  );
$$;


--
-- Name: _matches_validate_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._matches_validate_stats() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
declare
  has_sport boolean;
  allowed jsonb;
  k text;
  v jsonb;
  v_clean jsonb := '{}'::jsonb;
  vnum numeric;
  vtxt text;
begin
  -- ¿la tabla matches tiene sport_id?
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='matches' and column_name='sport_id'
  ) into has_sport;

  if not has_sport then
    -- no podemos validar claves por deporte; salimos sin tocar stats
    return new;
  end if;

  if new.sport_id is null then
    raise exception 'sport_id no puede ser NULL para validar stats';
  end if;

  -- obtener esquema permitido
  select stats->'fields' into allowed
  from public.sports
  where id = new.sport_id;

  if allowed is null or jsonb_typeof(allowed) <> 'array' then
    raise exception 'El deporte % no tiene definido stats.fields en public.sports', new.sport_id;
  end if;

  -- validar claves y normalizar valores
  for k, v in select key, value from jsonb_each(coalesce(new.stats, '{}'::jsonb)) loop
    -- clave permitida
    if not exists (
      select 1 from jsonb_array_elements(allowed) f where f ->> 'key' = k
    ) then
      raise exception 'Campo de estadística "%" no permitido para este deporte', k;
    end if;

    -- número JSON: clamp 0..999
    if jsonb_typeof(v) = 'number' then
      vnum := (v)::text::numeric;
      if vnum < 0 then vnum := 0; end if;
      if vnum > 999 then vnum := 999; end if;
      v_clean := v_clean || jsonb_build_object(k, to_jsonb(vnum));

    -- string: si son solo dígitos, convertir y clamp; si no, dejar tal cual
    elsif jsonb_typeof(v) = 'string' then
      vtxt := btrim((v)::text, '\"');  -- "123" -> 123
      if vtxt ~ '^\d+$' then
        vnum := vtxt::numeric;
        if vnum < 0 then vnum := 0; end if;
        if vnum > 999 then vnum := 999; end if;
        v_clean := v_clean || jsonb_build_object(k, to_jsonb(vnum));
      else
        v_clean := v_clean || jsonb_build_object(k, v);
      end if;

    else
      -- otros tipos: los dejamos tal cual
      v_clean := v_clean || jsonb_build_object(k, v);
    end if;
  end loop;

  new.stats := v_clean;
  return new;
end
$_$;


--
-- Name: _remaining_seats_core(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._remaining_seats_core(p_user_id uuid) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT COUNT(*)::int
  FROM public.access_code_usages u
  JOIN public.access_codes c ON c.id = u.code_id
  WHERE u.user_id = p_user_id
    AND u.player_id IS NULL                 -- asiento aún sin asignar
    AND (c.active IS TRUE OR c.active IS NULL);  -- por si desactivas códigos
$$;


--
-- Name: _validate_membership_consistency(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._validate_membership_consistency() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_team record;
begin
  select club_id, sport_id into v_team from public.teams where id = new.team_id;
  if not found then
    raise exception 'Equipo inexistente';
  end if;
  if v_team.club_id <> new.club_id then
    raise exception 'El equipo no pertenece al club indicado';
  end if;
  if v_team.sport_id <> new.sport_id then
    raise exception 'El equipo no pertenece al deporte indicado';
  end if;
  return new;
end $$;


--
-- Name: assign_credit_to_player(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_credit_to_player(p_user_id uuid, p_player_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_usage_id uuid;
BEGIN
  UPDATE public.access_code_usages u
     SET player_id = p_player_id
   WHERE u.id = (
     SELECT u2.id
     FROM public.access_code_usages u2
     JOIN public.access_codes c ON c.id = u2.code_id
     WHERE u2.user_id = p_user_id
       AND u2.player_id IS NULL
       AND c.active = TRUE
     ORDER BY u2.created_at
     FOR UPDATE SKIP LOCKED
     LIMIT 1
   )
   RETURNING id INTO v_usage_id;

  IF v_usage_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'No hay créditos disponibles');
  END IF;

  RETURN jsonb_build_object('ok', true, 'usage_id', v_usage_id);
END;
$$;


--
-- Name: assign_credit_to_player(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_credit_to_player(p_user_id uuid, p_player_id uuid, p_plan_id uuid) RETURNS TABLE(ok boolean, message text, starts_at timestamp with time zone, ends_at timestamp with time zone, remaining_credits integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_active boolean;
  v_credit record;
  v_days integer;
  v_start timestamptz;
  v_end   timestamptz;
begin
  -- No acumulable: si ya está activo, no permitimos asignar crédito
  select exists(
    select 1
    from public.player_active_access
    where user_id = p_user_id and player_id = p_player_id and is_active
  ) into v_active;

  if v_active then
    return query select false, 'Este jugador aún tiene acceso activo'::text, null::timestamptz, null::timestamptz, null::integer;
    return;
  end if;

  -- Días del plan
  select days into v_days
  from public.subscription_plans
  where id = p_plan_id;

  if v_days is null then
    return query select false, 'Plan no disponible'::text, null, null, null;
    return;
  end if;

  -- Buscar un crédito disponible del usuario para ese plan (FIFO) y bloquearlo
  select id, remaining_units
    into v_credit
  from public.player_credits
  where user_id = p_user_id
    and plan_id = p_plan_id
    and remaining_units > 0
  order by created_at asc
  for update skip locked
  limit 1;

  if not found then
    return query select false, 'No tienes créditos disponibles para este plan'::text, null, null, null;
    return;
  end if;

  -- Calcular periodo
  v_start := public._calc_start_for_player(p_user_id, p_player_id);
  v_end   := v_start + make_interval(days => v_days);

  -- Consumir 1 unidad
  update public.player_credits
     set remaining_units = remaining_units - 1
   where id = v_credit.id
   returning remaining_units into remaining_credits;

  -- Otorgar el entitlement
  insert into public.player_entitlements(user_id, player_id, source, source_id, starts_at, ends_at)
  values (p_user_id, p_player_id, 'stripe', v_credit.id::text, v_start, v_end);

  return query select true, 'Crédito aplicado'::text, v_start, v_end, remaining_credits;
end;
$$;


--
-- Name: assign_free_seat_to_player(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_free_seat_to_player(p_user_id uuid, p_player_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_usage_id uuid;
BEGIN
  -- bloquea una fila libre del usuario y la asigna al player
  UPDATE public.access_code_usages u
  SET player_id = p_player_id
  WHERE u.id = (
    SELECT u2.id
    FROM public.access_code_usages u2
    JOIN public.access_codes c ON c.id = u2.code_id
    WHERE u2.user_id = p_user_id
      AND u2.player_id IS NULL
      AND (c.active IS TRUE OR c.active IS NULL)
    ORDER BY u2.created_at  -- o el criterio que prefieras
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING id INTO v_usage_id;

  IF v_usage_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'No hay seats libres para asignar');
  END IF;

  RETURN jsonb_build_object('ok', true, 'usage_id', v_usage_id);
END;
$$;


--
-- Name: cmp_lock_player_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cmp_lock_player_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.player_id <> OLD.player_id THEN
    RAISE EXCEPTION 'No se permite cambiar player_id en competitions';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: create_code_subscription(text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_code_subscription(p_code text, p_plan_id uuid, p_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_code_row record;
  v_plan_row record;
  v_subscription_id uuid;
  v_current_end timestamptz;
  v_new_end timestamptz;
  v_seats integer;
  v_days integer;
BEGIN
  -- 1) Obtener usuario: usar p_user_id si se proporciona, sino usar auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Usuario no autenticado');
  END IF;

  -- 2) Buscar y validar el código de acceso
  -- NOTA: Según el schema real de access_codes:
  -- - La columna del código se llama 'code' (no 'code_text')
  -- - El contador de usos se llama 'usage_count' (no 'used_count')
  -- - Los días se llaman 'num_days' (no 'days')
  -- - No hay campo 'expires_at' ni 'seats' en access_codes
  SELECT * INTO v_code_row
  FROM access_codes
  WHERE code = p_code
    AND active = true
    AND (max_uses IS NULL OR usage_count < max_uses);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Código inválido o expirado');
  END IF;

  -- 3) Verificar que el usuario no haya usado este código antes
  IF EXISTS (
    SELECT 1 FROM access_code_usages
    WHERE code_id = v_code_row.id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Este código ya fue utilizado por ti');
  END IF;

  -- 4) Obtener información del plan
  SELECT * INTO v_plan_row
  FROM subscription_plans
  WHERE id = p_plan_id AND active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Plan no encontrado o inactivo');
  END IF;

  -- 5) Usar valores del código de acceso (si existen) o del plan
  -- NOTA: access_codes no tiene campo 'seats', se usa 1 por defecto para códigos
  -- El campo de días se llama 'num_days' (no 'days')
  v_seats := 1; -- Los códigos de acceso siempre otorgan 1 seat
  v_days := COALESCE(v_code_row.num_days, v_plan_row.days, 365);

  -- 6) Calcular fecha de expiración
  -- Buscar la fecha de expiración más lejana de suscripciones existentes del usuario
  SELECT MAX(current_period_end) INTO v_current_end
  FROM subscriptions
  WHERE user_id = v_user_id AND current_period_end IS NOT NULL;

  IF v_current_end IS NULL OR v_current_end < now() THEN
    v_new_end := now() + (v_days || ' days')::interval;
  ELSE
    v_new_end := v_current_end + (v_days || ' days')::interval;
  END IF;

  -- 7) Insertar suscripción con status='active' (CRÍTICO: debe ser 'active' para cumplir el constraint)
  INSERT INTO subscriptions (
    user_id,
    plan_id,
    seats,
    status,                    -- ← AQUÍ está la corrección: debe ser 'active'
    current_period_end,
    cancel_at_period_end,
    amount,
    currency,
    stripe_customer_id,
    stripe_subscription_id,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_plan_id,
    v_seats,
    'active'::text,            -- ← Valor explícito que cumple con subscriptions_status_check
    v_new_end,
    false,
    COALESCE(v_plan_row.amount_cents, 0),
    COALESCE(v_plan_row.currency, 'EUR'),
    NULL,
    NULL,
    now(),
    now()
  )
  RETURNING id INTO v_subscription_id;

  -- 8) Registrar el uso del código
  -- NOTA: La columna de timestamp se llama 'created_at' (no 'used_at')
  -- NOTA: player_id puede ser NULL si el código se usa para suscripción general, no para un jugador específico
  INSERT INTO access_code_usages (code_id, user_id, player_id, created_at)
  VALUES (v_code_row.id, v_user_id, NULL, now());

  -- 9) Incrementar contador de usos
  -- NOTA: El campo se llama 'usage_count' (no 'used_count')
  UPDATE access_codes
  SET usage_count = usage_count + 1
  WHERE id = v_code_row.id;

  -- 10) Retornar éxito
  RETURN jsonb_build_object(
    'ok', true,
    'subscription_id', v_subscription_id,
    'message', 'Suscripción creada exitosamente'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'message', 'Error al crear suscripción: ' || SQLERRM
    );
END;
$$;


--
-- Name: create_player_and_link_code(uuid, text, date, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_player_and_link_code(p_access_code_id uuid, p_full_name text, p_birthday date, p_status boolean DEFAULT true) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_player_id uuid;
begin
  -- INSERT explícito en players con tus columnas reales
  insert into public.players (
    user_id,
    full_name,
    birthday,
    status,
    created_at,
    updated_at
  ) values (
    auth.uid(),
    nullif(p_full_name, ''),
    p_birthday,
    coalesce(p_status, true),
    now(),
    now()
  )
  returning id into v_player_id;

  -- Si llega un access_code_id, dejamos el rastro en subscription_players
  if p_access_code_id is not null then
    insert into public.subscription_players (
      subscription_id,  -- null si viene de código
      player_id,
      access_code_id,
      amount_cents,
      currency,
      source,
      linked_at,
      created_at
    ) values (
      null,
      v_player_id,
      p_access_code_id,
      0,
      'EUR',
      'code',
      now(),
      now()
    );
  end if;

  return v_player_id;
end;
$$;


--
-- Name: create_player_link_subscription(text, date, boolean, text, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_player_link_subscription(p_full_name text, p_birthday date DEFAULT NULL::date, p_status boolean DEFAULT true, p_code_text text DEFAULT NULL::text, p_season_id uuid DEFAULT NULL::uuid, p_memberships jsonb DEFAULT NULL::jsonb) RETURNS TABLE(player_id uuid, subscription_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: enforce_license_owner(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_license_owner() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.players where id = new.player_id;
  if v_owner is null or v_owner <> new.user_id then
    raise exception 'player % no pertenece al user %', new.player_id, new.user_id;
  end if;
  return new;
end $$;


--
-- Name: enforce_subscription_capacity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_subscription_capacity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  active_links int;
  max_seats int;
begin
  select seats into max_seats from public.subscriptions where id = coalesce(new.subscription_id, old.subscription_id);
  select count(*) into active_links
  from public.subscription_players
  where subscription_id = coalesce(new.subscription_id, old.subscription_id)
    and unlinked_at is null
    and (tg_op <> 'UPDATE' or id <> new.id);

  if active_links >= max_seats then
    raise exception 'No quedan plazas disponibles en esta suscripción';
  end if;

  return new;
end$$;


--
-- Name: ensure_profile(uuid, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_profile(p_user_id uuid, p_email text, p_name text DEFAULT NULL::text, p_surname text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_locale text DEFAULT 'es-ES'::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if p_email is null then
    raise exception 'email es obligatorio';
  end if;

  insert into public.users (id, email, name, surname, phone, locale, status)
  values (p_user_id, p_email, p_name, p_surname, p_phone, p_locale, true)
  on conflict (id) do update
    set email   = coalesce(excluded.email,   public.users.email),
        name    = coalesce(excluded.name,    public.users.name),
        surname = coalesce(excluded.surname, public.users.surname),
        phone   = coalesce(excluded.phone,   public.users.phone),
        locale  = coalesce(excluded.locale,  public.users.locale),
        status  = true;
end;
$$;


--
-- Name: ensure_profile_server(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_profile_server() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_auth_email text;
begin
  if v_uid is null then
    raise exception 'auth.uid() es null';
  end if;

  select email into v_auth_email
  from auth.users
  where id = v_uid;

  -- crea si no existe; si existe, solo actualiza email si llega uno no nulo
  insert into public.users (id, email, status, created_at)
  values (v_uid, v_auth_email, true, now())
  on conflict (id) do update
    set email  = coalesce(excluded.email, public.users.email),
        status = coalesce(public.users.status, true);
end;
$$;


--
-- Name: fn_sync_user_from_auth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sync_user_from_auth() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.users as u (id, email, name, surname, locale)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', u.name),
    coalesce(new.raw_user_meta_data->>'surname', u.surname),
    coalesce(new.raw_user_meta_data->>'locale', 'en')
  )
  on conflict (id) do update
  set email   = excluded.email,
      name    = coalesce(excluded.name, u.name),
      surname = coalesce(excluded.surname, u.surname),
      locale  = coalesce(excluded.locale, u.locale, 'en');

  return new;
end;
$$;


--
-- Name: has_active_access(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_active_access(p_player_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.access_code_usages u
    JOIN public.access_codes c ON c.id = u.code_id
    WHERE u.player_id = p_player_id
      AND c.active = TRUE
  );
$$;


--
-- Name: link_player_to_subscription(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.link_player_to_subscription(p_player_id uuid, p_user_id uuid DEFAULT auth.uid()) RETURNS TABLE(ok boolean, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_uid             uuid := coalesce(p_user_id, auth.uid());
  v_now             timestamptz := now();
  v_subscription_id uuid;
begin
  if v_uid is null then
    return query select false, 'No autenticado';
  end if;

  select s.id
    into v_subscription_id
  from public.subscriptions s
  where s.user_id = v_uid
    and (s.status = true or lower(coalesce(s.status::text,'active')) = 'active')
    and (s.current_period_end is null or s.current_period_end > v_now)
  order by coalesce(s.current_period_end, '9999-12-31'::timestamptz) desc
  limit 1;

  if v_subscription_id is null then
    return query select false, 'No hay suscripción activa';
  end if;

  insert into public.subscription_players as sp
    (subscription_id, player_id, linked_at, source)
  values
    (v_subscription_id, p_player_id, v_now, 'paid')
  on conflict (subscription_id, player_id) do nothing;

  return query select true, 'Vinculado correctamente';
exception
  when others then
    return query select false, SQLERRM;
end;
$$;


--
-- Name: mm_fill_user_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mm_fill_user_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  -- Rellena user_id automáticamente según el dueño del player del match
  select p.user_id
    into new.user_id
  from public.matches m
  join public.players p on p.id = m.player_id
  where m.id = new.match_id;

  return new;
end $$;


--
-- Name: mm_lock_user_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mm_lock_user_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id no puede modificarse';
  end if;
  return new;
end $$;


--
-- Name: players_set_owner(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.players_set_owner() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- En INSERT: si no viene user_id, se asigna auth.uid();
  -- si viene, debe coincidir con auth.uid()
  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS NULL THEN
      NEW.user_id := auth.uid();
    ELSIF NEW.user_id <> auth.uid() THEN
      RAISE EXCEPTION 'user_id must match auth.uid()';
    END IF;
    RETURN NEW;
  END IF;

  -- En UPDATE: prohibir cambiar el propietario
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id <> OLD.user_id THEN
      RAISE EXCEPTION 'Changing owner is not allowed';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: preview_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.preview_code(p_code text) RETURNS TABLE(ok boolean, message text, num_days integer, remaining_uses integer)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_code record;
  v_remaining integer;
begin
  select id, active, num_days, usage_count, max_uses
    into v_code
  from public.access_codes
  where lower(code) = lower(p_code);

  if not found then
    return query select false, 'Código inexistente.'::text, null::integer, null::integer; return;
  end if;

  if not v_code.active then
    return query select false, 'Código inactivo.'::text, null, null; return;
  end if;

  v_remaining := greatest(v_code.max_uses - v_code.usage_count, 0);

  if v_remaining <= 0 then
    return query select false, 'Este código ha agotado sus usos.'::text, null, 0; return;
  end if;

  return query select true, 'Código válido.'::text, v_code.num_days::integer, v_remaining::integer;
end;
$$;


--
-- Name: ps_lock_player_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ps_lock_player_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.player_id <> OLD.player_id THEN
    RAISE EXCEPTION 'No se permite cambiar player_id en player_seasons';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: redeem_access_code(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.redeem_access_code(p_code text, p_user_id uuid) RETURNS TABLE(ok boolean, message text, ends_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_code record;
  v_starts timestamptz := now();
  v_ends   timestamptz;
begin
  -- bloquea el código durante la transacción
  select * into v_code
  from public.access_codes
  where lower(code) = lower(p_code) and active = true
  for update;

  if not found then
    return query select false, 'Código inexistente o inactivo'::text, null::timestamptz; return;
  end if;

  if v_code.usage_count >= v_code.max_uses then
    return query select false, 'Este código ya alcanzó su límite de usos'::text, null::timestamptz; return;
  end if;

  v_ends := v_starts + make_interval(days => v_code.num_days);

  -- incrementa uso
  update public.access_codes
    set usage_count = usage_count + 1
  where id = v_code.id;

  -- crea el entitlement
  insert into public.user_entitlements(user_id, source, source_id, starts_at, ends_at)
  values (p_user_id, 'code', v_code.id::text, v_starts, v_ends);

  return query select true, 'Código aplicado'::text, v_ends;
end;
$$;


--
-- Name: redeem_access_code_for_player(text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.redeem_access_code_for_player(p_code text, p_user_id uuid, p_player_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_code_id uuid;
  v_usage_id uuid;
BEGIN
  SELECT c.id INTO v_code_id
  FROM public.access_codes c
  WHERE c.code = p_code
    AND c.active = TRUE
  LIMIT 1;

  IF v_code_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Código no válido o inactivo');
  END IF;

  UPDATE public.access_code_usages u
     SET player_id = p_player_id
   WHERE u.id = (
     SELECT u2.id
     FROM public.access_code_usages u2
     WHERE u2.user_id = p_user_id
       AND u2.code_id = v_code_id
       AND u2.player_id IS NULL
     ORDER BY u2.created_at
     FOR UPDATE SKIP LOCKED
     LIMIT 1
   )
   RETURNING id INTO v_usage_id;

  IF v_usage_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'No quedan usos disponibles de este código');
  END IF;

  RETURN jsonb_build_object('ok', true, 'usage_id', v_usage_id);
END;
$$;


--
-- Name: redeem_code_and_link_player(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.redeem_code_and_link_player(p_player_id uuid, p_code text) RETURNS TABLE(ok boolean, message text, subscription_id uuid, ends_at timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select *
  from public.redeem_code_and_link_player(auth.uid(), p_player_id, p_code);
$$;


--
-- Name: redeem_code_and_link_player(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.redeem_code_and_link_player(p_player_id uuid, p_code text, p_user_id uuid DEFAULT auth.uid()) RETURNS TABLE(ok boolean, message text, ends_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_uid        uuid := coalesce(p_user_id, auth.uid());
  v_free_plan  uuid;
  v_res        record;
  v_sub_id     uuid;
  v_end        timestamptz;
begin
  -- 0) Seguridad básica
  if v_uid is null then
    return query select false, 'No autenticado', null::timestamptz;
    return;
  end if;

  -- 1) Localiza el plan FREE activo
  select id
    into v_free_plan
  from public.subscription_plans
  where free = true and active = true
  limit 1;

  if v_free_plan is null then
    return query select false, 'No hay plan FREE activo', null::timestamptz;
    return;
  end if;

  -- 2) Crea/asegura la suscripción usando tu RPC existente
  --    (esta RPC valida el código, incrementa uso y devuelve la suscripción)
  select *
    into v_res
  from public.create_code_subscription(
    p_code   := p_code,
    p_plan_id:= v_free_plan,
    p_user_id:= v_uid
  );

  if coalesce(v_res.ok, false) is not true or v_res.subscription_id is null then
    return query select false, coalesce(v_res.message, 'Código inválido o agotado'), null::timestamptz;
    return;
  end if;

  v_sub_id := v_res.subscription_id;
  v_end    := v_res.current_period_end;

  -- 3) Vincula el jugador a la suscripción (idempotente)
  perform 1
  from public.subscription_players
  where subscription_id = v_sub_id
    and player_id       = p_player_id;

  if not found then
    insert into public.subscription_players(
      subscription_id,
      player_id,
      linked_at,
      source
    )
    values (
      v_sub_id,
      p_player_id,
      now(),
      'code'
    )
    on conflict (subscription_id, player_id) do nothing;
  end if;

  -- 4) Devuelve OK + fin de periodo
  return query select true, 'OK', v_end;

exception
  when others then
    return query select false, SQLERRM, null::timestamptz;
end;
$$;


--
-- Name: remaining_seats_for_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remaining_seats_for_user() RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$ SELECT public.remaining_seats_for_user(auth.uid()); $$;


--
-- Name: remaining_seats_for_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remaining_seats_for_user(p_user_id uuid) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
  SELECT COUNT(*)::int
  FROM public.access_code_usages u
  JOIN public.access_codes c ON c.id = u.code_id
  WHERE u.user_id = p_user_id
    AND u.player_id IS NULL
    AND c.active = TRUE
$$;


--
-- Name: seats_remaining(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.seats_remaining(p_user_id uuid) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT GREATEST(
    COALESCE((
      SELECT SUM(s.seats)::integer
      FROM public.subscriptions s
      WHERE s.user_id = p_user_id
        AND lower(coalesce(s.status::text, '')) IN ('active', 'trialing')
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
    ), 0)
    - COALESCE((
      SELECT COUNT(*)::integer
      FROM public.players p
      WHERE p.user_id = p_user_id
        AND COALESCE(p.status, true) = true
    ), 0),
    0
  );
$$;


--
-- Name: FUNCTION seats_remaining(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.seats_remaining(p_user_id uuid) IS 'Asientos disponibles = SUM(seats) en subscriptions activas − jugadores con status activo (COALESCE(status,true)).';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end $$;


--
-- Name: storage_set_owner(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.storage_set_owner() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if new.owner is null then
    new.owner := auth.uid();
  end if;
  return new;
end $$;


--
-- Name: sync_public_user_from_auth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_public_user_from_auth() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  begin
    insert into public.users (id, name, surname, email, phone, status, accepted_terms, accepted_marketing, locale)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name',''),
      coalesce(new.raw_user_meta_data->>'surname',''),
      coalesce(new.email,''),
      new.phone,
      true,
      coalesce((new.raw_user_meta_data->>'accepted_terms')::boolean,false),
      coalesce((new.raw_user_meta_data->>'accepted_marketing')::boolean,false),
      nullif(left(coalesce(new.raw_user_meta_data->>'locale',''),2),'')
    )
    on conflict (id) do update
      set name=excluded.name,
          surname=excluded.surname,
          email=excluded.email,
          phone=excluded.phone,
          accepted_terms=excluded.accepted_terms,
          accepted_marketing=excluded.accepted_marketing,
          locale=excluded.locale;
    return new;
  exception when others then
    insert into public.sync_user_debug(phase,email,err,payload)
    values ('insert', new.email, SQLERRM, to_jsonb(new));
    raise;
  end;
end $$;


--
-- Name: sync_public_user_on_auth_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_public_user_on_auth_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  begin
    update public.users
       set email = coalesce(new.email, public.users.email),
           phone = new.phone,
           name = coalesce(new.raw_user_meta_data->>'name', public.users.name),
           surname = coalesce(new.raw_user_meta_data->>'surname', public.users.surname),
           accepted_terms = coalesce((new.raw_user_meta_data->>'accepted_terms')::boolean, public.users.accepted_terms),
           accepted_marketing = coalesce((new.raw_user_meta_data->>'accepted_marketing')::boolean, public.users.accepted_marketing),
           locale = coalesce(nullif(left(coalesce(new.raw_user_meta_data->>'locale',''),2),''), public.users.locale)
     where id = new.id;
    return new;
  exception when others then
    insert into public.sync_user_debug(phase,email,err,payload)
    values ('update', new.email, SQLERRM, to_jsonb(new));
    raise;
  end;
end $$;


--
-- Name: tg_set_timestamps(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_set_timestamps() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, timezone('utc', now()));
    NEW.updated_at := COALESCE(NEW.updated_at, timezone('utc', now()));
  ELSE
    NEW.updated_at := timezone('utc', now());
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: users_enforce_role_change_policy(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.users_enforce_role_change_policy() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  jwt_role text := coalesce((auth.jwt() ->> 'role'), '');
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;
  IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
    RETURN NEW;
  END IF;
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF jwt_role = 'authenticated' AND auth.uid() IS NOT NULL AND auth.uid() = NEW.id THEN
    RAISE EXCEPTION 'No está permitido modificar el propio rol de aplicación';
  END IF;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_code_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_code_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    access_code_id uuid NOT NULL,
    player_id uuid NOT NULL,
    redeemed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: access_code_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_code_usages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code_id uuid NOT NULL,
    user_id uuid NOT NULL,
    player_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: access_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    max_uses integer NOT NULL,
    prescriber text,
    num_days integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean GENERATED ALWAYS AS (active) STORED,
    CONSTRAINT access_codes_max_uses_check CHECK ((max_uses >= 0)),
    CONSTRAINT access_codes_num_days_check CHECK ((num_days > 0))
);


--
-- Name: clubs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clubs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    city text,
    country text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    player_id uuid
);


--
-- Name: competitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id uuid NOT NULL,
    sport_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    player_id uuid,
    team_id uuid,
    category_id uuid,
    club_id uuid
);


--
-- Name: google_drive_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_drive_connections (
    user_id uuid NOT NULL,
    refresh_token_encrypted text NOT NULL,
    scope text,
    token_type text,
    connected_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_refresh_at timestamp with time zone,
    last_error text,
    status text DEFAULT 'connected'::text NOT NULL,
    CONSTRAINT google_drive_connections_status_check CHECK ((status = ANY (ARRAY['connected'::text, 'reconnect-required'::text, 'disconnected'::text])))
);


--
-- Name: match_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    match_id uuid NOT NULL,
    player_id uuid,
    kind text NOT NULL,
    storage_path text,
    device_uri text,
    mime_type text,
    size_bytes integer,
    taken_at timestamp with time zone,
    checksum text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    width integer,
    height integer,
    duration_ms integer,
    synced_at timestamp with time zone,
    storage_provider text DEFAULT 'local'::text,
    google_drive_file_id text,
    deleted_at timestamp with time zone,
    CONSTRAINT match_media_kind_chk CHECK ((kind = ANY (ARRAY['image'::text, 'video'::text]))),
    CONSTRAINT match_media_storage_provider_check CHECK ((storage_provider = ANY (ARRAY['local'::text, 'supabase'::text, 'drive'::text, 'r2'::text])))
);


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id uuid,
    sport_id uuid NOT NULL,
    competition_id uuid,
    date_at timestamp with time zone NOT NULL,
    place text,
    status text DEFAULT 'played'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stats jsonb DEFAULT '{}'::jsonb NOT NULL,
    player_id uuid NOT NULL,
    team_id uuid,
    rival_team_name text,
    my_score smallint,
    rival_score smallint,
    is_home boolean DEFAULT true NOT NULL,
    CONSTRAINT matches_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'played'::text, 'canceled'::text])))
);


--
-- Name: media_storage_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_storage_preferences (
    user_id uuid NOT NULL,
    provider text DEFAULT 'local'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT media_storage_preferences_provider_check CHECK ((provider = ANY (ARRAY['local'::text, 'drive'::text, 'r2'::text, 'supabase'::text])))
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    subscription_id uuid,
    provider text DEFAULT 'stripe'::text NOT NULL,
    stripe_payment_intent_id text,
    stripe_invoice_id text,
    receipt_url text,
    amount_cents bigint NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    description text,
    status text DEFAULT 'succeeded'::text NOT NULL,
    paid_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: player_active_access; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.player_active_access WITH (security_invoker='true') AS
 SELECT DISTINCT ON (u.player_id) u.player_id,
    u.user_id,
    u.code_id,
    u.created_at AS assigned_at
   FROM (public.access_code_usages u
     JOIN public.access_codes c ON ((c.id = u.code_id)))
  WHERE ((u.player_id IS NOT NULL) AND ((c.active IS TRUE) OR (c.active IS NULL)))
  ORDER BY u.player_id, u.created_at DESC;


--
-- Name: player_credits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_credits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    total_units integer NOT NULL,
    remaining_units integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT player_credits_remaining_units_check CHECK ((remaining_units >= 0)),
    CONSTRAINT player_credits_total_units_check CHECK ((total_units > 0))
);


--
-- Name: player_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    player_id uuid NOT NULL,
    local_path text NOT NULL,
    mime_type text,
    width integer,
    height integer,
    captured_at timestamp with time zone,
    device_id text,
    checksum text,
    tags text[] DEFAULT '{}'::text[],
    notes text,
    match_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT player_images_height_check CHECK (((height IS NULL) OR (height > 0))),
    CONSTRAINT player_images_width_check CHECK (((width IS NULL) OR (width > 0)))
);


--
-- Name: player_licenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_licenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    user_id uuid NOT NULL,
    provider text DEFAULT 'stripe'::text NOT NULL,
    external_subscription_id text,
    external_price_id text,
    status text DEFAULT 'active'::text NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone DEFAULT (now() + '2 years'::interval) NOT NULL,
    amount_cents integer DEFAULT 250 NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT player_licenses_provider_check CHECK ((provider = ANY (ARRAY['stripe'::text, 'lemonsqueezy'::text, 'paddle'::text, 'manual'::text]))),
    CONSTRAINT player_licenses_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'canceled'::text, 'refunded'::text, 'pending'::text])))
);


--
-- Name: player_seasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_seasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    season_id uuid NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    avatar text
);


--
-- Name: players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.players (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    birthday date,
    status boolean DEFAULT true NOT NULL
);


--
-- Name: seasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    year_start integer NOT NULL,
    year_end integer NOT NULL,
    CONSTRAINT seasons_year_span_chk CHECK (((year_end = (year_start + 1)) AND (year_start >= 1900) AND (year_start <= 3000)))
);


--
-- Name: sport_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sport_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sport_id uuid NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    gender text DEFAULT 'mixto'::text NOT NULL,
    age_min smallint,
    age_max smallint,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sport_categories_gender_check CHECK ((gender = ANY (ARRAY['masculino'::text, 'femenino'::text, 'mixto'::text])))
);


--
-- Name: sports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    is_team boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stats jsonb DEFAULT '{}'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: storage_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_key text,
    gb_amount integer NOT NULL,
    amount_cents bigint NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    stripe_price_id text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: storage_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan_id uuid,
    gb_amount integer NOT NULL,
    amount_cents bigint NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    current_period_start timestamp with time zone DEFAULT now() NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    stripe_customer_id text,
    stripe_payment_intent_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT storage_subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: stripe_checkout_fulfillments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_checkout_fulfillments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stripe_checkout_session_id text NOT NULL,
    user_id uuid NOT NULL,
    subscription_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE stripe_checkout_fulfillments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stripe_checkout_fulfillments IS 'Una fila por checkout.session completado; evita duplicar asientos entre webhook y confirm-session.';


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    stripe_price_id text NOT NULL,
    days integer NOT NULL,
    amount_cents integer NOT NULL,
    currency text DEFAULT 'eur'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    free boolean DEFAULT false NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT subscription_plans_amount_cents_check CHECK ((amount_cents >= 0)),
    CONSTRAINT subscription_plans_days_check CHECK ((days > 0))
);


--
-- Name: subscription_plans_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.subscription_plans_view WITH (security_invoker='true') AS
 SELECT id,
    name,
    days,
    amount_cents AS price_cents,
    upper(currency) AS currency,
    active,
    free,
    stripe_price_id,
    created_at
   FROM public.subscription_plans;


--
-- Name: subscription_players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_players (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid NOT NULL,
    player_id uuid NOT NULL,
    linked_at timestamp with time zone DEFAULT now() NOT NULL,
    unlinked_at timestamp with time zone,
    amount_cents bigint,
    currency text DEFAULT 'EUR'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source text,
    access_code_id uuid,
    CONSTRAINT subscription_players_amount_cents_check CHECK (((amount_cents IS NULL) OR (amount_cents >= 0))),
    CONSTRAINT subscription_players_currency_check CHECK ((char_length(currency) = 3)),
    CONSTRAINT subscription_players_link_order_chk CHECK (((unlinked_at IS NULL) OR (unlinked_at > linked_at))),
    CONSTRAINT subscription_players_source_check CHECK ((source = ANY (ARRAY['code'::text, 'stripe'::text])))
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    access_code_id uuid,
    amount bigint,
    currency text DEFAULT 'EUR'::text NOT NULL,
    seats integer DEFAULT 1 NOT NULL,
    notified_expiry_7d_at timestamp with time zone,
    plan_id uuid,
    status text DEFAULT 'active'::text,
    CONSTRAINT subscriptions_amount_cents_chk CHECK (((amount IS NULL) OR (amount >= 0))),
    CONSTRAINT subscriptions_amount_check CHECK ((amount >= 0)),
    CONSTRAINT subscriptions_currency_check CHECK ((char_length(currency) = 3)),
    CONSTRAINT subscriptions_seats_check CHECK ((seats >= 1)),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'trialing'::text, 'past_due'::text, 'canceled'::text, 'unpaid'::text, 'incomplete'::text, 'incomplete_expired'::text, 'paused'::text])))
);


--
-- Name: COLUMN subscriptions.amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscriptions.amount IS 'Importe en céntimos';


--
-- Name: COLUMN subscriptions.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscriptions.status IS 'Estado de la suscripción según Stripe: active, trialing, past_due, canceled, unpaid, incomplete, incomplete_expired, paused';


--
-- Name: sync_user_debug; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_user_debug (
    id bigint NOT NULL,
    happened_at timestamp with time zone DEFAULT now() NOT NULL,
    phase text NOT NULL,
    email text,
    err text,
    payload jsonb
);


--
-- Name: sync_user_debug_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sync_user_debug_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sync_user_debug_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sync_user_debug_id_seq OWNED BY public.sync_user_debug.id;


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    club_id uuid,
    sport_id uuid,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    player_id uuid
);


--
-- Name: user_subscriptions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_subscriptions WITH (security_invoker='true') AS
 SELECT user_id,
        CASE
            WHEN (max(ends_at) FILTER (WHERE (status = 'active'::text)) > now()) THEN 'active'::text
            ELSE 'none'::text
        END AS status,
    max(ends_at) FILTER (WHERE (status = 'active'::text)) AS current_period_end
   FROM public.player_licenses
  GROUP BY user_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    surname text DEFAULT ''::text NOT NULL,
    email text,
    phone text,
    status boolean DEFAULT true NOT NULL,
    accepted_terms boolean DEFAULT false NOT NULL,
    accepted_marketing boolean DEFAULT false NOT NULL,
    locale character(2) DEFAULT 'en'::bpchar,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role text,
    CONSTRAINT users_email_ck CHECK ((POSITION(('@'::text) IN (email)) > 1))
);


--
-- Name: COLUMN users.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.role IS 'Rol de aplicación. Valor Superadmin concede acceso al panel /admin (comprobado en servidor y middleware).';


--
-- Name: sync_user_debug id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_user_debug ALTER COLUMN id SET DEFAULT nextval('public.sync_user_debug_id_seq'::regclass);


--
-- Name: access_code_redemptions access_code_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_code_redemptions
    ADD CONSTRAINT access_code_redemptions_pkey PRIMARY KEY (id);


--
-- Name: access_code_usages access_code_usages_code_id_user_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_code_usages
    ADD CONSTRAINT access_code_usages_code_id_user_id_player_id_key UNIQUE (code_id, user_id, player_id);


--
-- Name: access_code_usages access_code_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_code_usages
    ADD CONSTRAINT access_code_usages_pkey PRIMARY KEY (id);


--
-- Name: access_codes access_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_codes
    ADD CONSTRAINT access_codes_pkey PRIMARY KEY (id);


--
-- Name: clubs clubs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_pkey PRIMARY KEY (id);


--
-- Name: competitions competitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT competitions_pkey PRIMARY KEY (id);


--
-- Name: google_drive_connections google_drive_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_drive_connections
    ADD CONSTRAINT google_drive_connections_pkey PRIMARY KEY (user_id);


--
-- Name: match_media match_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_media
    ADD CONSTRAINT match_media_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: media_storage_preferences media_storage_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_storage_preferences
    ADD CONSTRAINT media_storage_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_stripe_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);


--
-- Name: player_credits player_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_credits
    ADD CONSTRAINT player_credits_pkey PRIMARY KEY (id);


--
-- Name: player_images player_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_images
    ADD CONSTRAINT player_images_pkey PRIMARY KEY (id);


--
-- Name: player_licenses player_licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_licenses
    ADD CONSTRAINT player_licenses_pkey PRIMARY KEY (id);


--
-- Name: player_seasons player_seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_seasons
    ADD CONSTRAINT player_seasons_pkey PRIMARY KEY (id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: seasons seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_pkey PRIMARY KEY (id);


--
-- Name: sport_categories sport_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sport_categories
    ADD CONSTRAINT sport_categories_pkey PRIMARY KEY (id);


--
-- Name: sports sports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports
    ADD CONSTRAINT sports_pkey PRIMARY KEY (id);


--
-- Name: sports sports_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports
    ADD CONSTRAINT sports_slug_key UNIQUE (slug);


--
-- Name: storage_plans storage_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_plans
    ADD CONSTRAINT storage_plans_pkey PRIMARY KEY (id);


--
-- Name: storage_subscriptions storage_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_subscriptions
    ADD CONSTRAINT storage_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: storage_subscriptions storage_subscriptions_stripe_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_subscriptions
    ADD CONSTRAINT storage_subscriptions_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);


--
-- Name: storage_subscriptions storage_subscriptions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_subscriptions
    ADD CONSTRAINT storage_subscriptions_user_id_key UNIQUE (user_id);


--
-- Name: stripe_checkout_fulfillments stripe_checkout_fulfillments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_checkout_fulfillments
    ADD CONSTRAINT stripe_checkout_fulfillments_pkey PRIMARY KEY (id);


--
-- Name: stripe_checkout_fulfillments stripe_checkout_fulfillments_session_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_checkout_fulfillments
    ADD CONSTRAINT stripe_checkout_fulfillments_session_unique UNIQUE (stripe_checkout_session_id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscription_players subscription_players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_players
    ADD CONSTRAINT subscription_players_pkey PRIMARY KEY (id);


--
-- Name: subscription_players subscription_players_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_players
    ADD CONSTRAINT subscription_players_unique UNIQUE (subscription_id, player_id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);


--
-- Name: sync_user_debug sync_user_debug_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_user_debug
    ADD CONSTRAINT sync_user_debug_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: clubs uq_clubs_player_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT uq_clubs_player_name UNIQUE (player_id, name);


--
-- Name: competitions uq_competitions_unique_per_player_ctx_v3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT uq_competitions_unique_per_player_ctx_v3 UNIQUE (player_id, season_id, sport_id, club_id, team_id, category_id, name);


--
-- Name: player_seasons uq_player_season_once; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_seasons
    ADD CONSTRAINT uq_player_season_once UNIQUE (player_id, season_id);


--
-- Name: sport_categories uq_sport_cat; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sport_categories
    ADD CONSTRAINT uq_sport_cat UNIQUE (sport_id, slug, gender);


--
-- Name: teams uq_teams_player_club_sport_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT uq_teams_player_club_sport_name UNIQUE (player_id, club_id, sport_id, name);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: access_code_redemptions_access_code_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX access_code_redemptions_access_code_id_idx ON public.access_code_redemptions USING btree (access_code_id);


--
-- Name: access_code_redemptions_player_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX access_code_redemptions_player_id_idx ON public.access_code_redemptions USING btree (player_id);


--
-- Name: access_code_usages_code_user_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX access_code_usages_code_user_unique ON public.access_code_usages USING btree (code_id, user_id);


--
-- Name: access_codes_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX access_codes_code_idx ON public.access_codes USING btree (code);


--
-- Name: access_codes_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX access_codes_code_key ON public.access_codes USING btree (lower(code));


--
-- Name: access_codes_code_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX access_codes_code_unique ON public.access_codes USING btree (lower(code));


--
-- Name: acu_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX acu_code_idx ON public.access_code_usages USING btree (code_id);


--
-- Name: acu_player_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX acu_player_idx ON public.access_code_usages USING btree (player_id);


--
-- Name: acu_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX acu_user_idx ON public.access_code_usages USING btree (user_id);


--
-- Name: clubs_name_city_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clubs_name_city_unique ON public.clubs USING btree (name, COALESCE(city, ''::text));


--
-- Name: idx_acu_code_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acu_code_id ON public.access_code_usages USING btree (code_id);


--
-- Name: idx_acu_user_nullplayer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acu_user_nullplayer ON public.access_code_usages USING btree (user_id, player_id);


--
-- Name: idx_clubs_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clubs_player_id ON public.clubs USING btree (player_id);


--
-- Name: idx_competitions_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_competitions_category ON public.competitions USING btree (category_id);


--
-- Name: idx_competitions_club; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_competitions_club ON public.competitions USING btree (club_id);


--
-- Name: idx_competitions_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_competitions_player ON public.competitions USING btree (player_id);


--
-- Name: idx_competitions_season; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_competitions_season ON public.competitions USING btree (season_id);


--
-- Name: idx_competitions_sport; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_competitions_sport ON public.competitions USING btree (sport_id);


--
-- Name: idx_competitions_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_competitions_team ON public.competitions USING btree (team_id);


--
-- Name: idx_match_media_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_media_created ON public.match_media USING btree (created_at);


--
-- Name: idx_match_media_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_media_match ON public.match_media USING btree (match_id);


--
-- Name: idx_match_media_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_media_player ON public.match_media USING btree (player_id);


--
-- Name: idx_match_media_unsynced; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_media_unsynced ON public.match_media USING btree (storage_path) WHERE (storage_path IS NULL);


--
-- Name: idx_match_media_user_r2_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_media_user_r2_active ON public.match_media USING btree (user_id) WHERE ((storage_path ~~ 'r2:%'::text) AND (deleted_at IS NULL));


--
-- Name: idx_matches_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_player_id ON public.matches USING btree (player_id);


--
-- Name: idx_mm_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mm_created ON public.match_media USING btree (created_at);


--
-- Name: idx_mm_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mm_match ON public.match_media USING btree (match_id);


--
-- Name: idx_mm_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mm_player ON public.match_media USING btree (player_id);


--
-- Name: idx_mm_unsynced; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mm_unsynced ON public.match_media USING btree (storage_path) WHERE (storage_path IS NULL);


--
-- Name: idx_payments_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_provider ON public.payments USING btree (provider);


--
-- Name: idx_payments_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_subscription ON public.payments USING btree (subscription_id, paid_at DESC);


--
-- Name: idx_payments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_user ON public.payments USING btree (user_id, paid_at DESC);


--
-- Name: idx_player_seasons_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_seasons_player ON public.player_seasons USING btree (player_id);


--
-- Name: idx_player_seasons_season; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_seasons_season ON public.player_seasons USING btree (season_id);


--
-- Name: idx_players_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_user_id ON public.players USING btree (user_id);


--
-- Name: idx_storage_subs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_storage_subs_user ON public.storage_subscriptions USING btree (user_id, current_period_end DESC);


--
-- Name: idx_sub_players_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_players_player ON public.subscription_players USING btree (player_id);


--
-- Name: idx_sub_players_sub; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_players_sub ON public.subscription_players USING btree (subscription_id);


--
-- Name: idx_subscription_players_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_players_code ON public.subscription_players USING btree (access_code_id);


--
-- Name: idx_subscription_players_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_players_player ON public.subscription_players USING btree (player_id) WHERE (unlinked_at IS NULL);


--
-- Name: idx_subscription_players_sub; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_players_sub ON public.subscription_players USING btree (subscription_id) WHERE (unlinked_at IS NULL);


--
-- Name: idx_subscriptions_access_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_access_code ON public.subscriptions USING btree (access_code_id);


--
-- Name: idx_subscriptions_status_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_status_active ON public.subscriptions USING btree (user_id, status) WHERE (status = ANY (ARRAY['active'::text, 'trialing'::text]));


--
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- Name: idx_teams_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_player_id ON public.teams USING btree (player_id);


--
-- Name: ix_licenses_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_licenses_player ON public.player_licenses USING btree (player_id);


--
-- Name: ix_licenses_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_licenses_user_active ON public.player_licenses USING btree (user_id, ends_at) WHERE (status = 'active'::text);


--
-- Name: ix_media_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_media_match ON public.match_media USING btree (match_id);


--
-- Name: ix_players_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_players_user ON public.players USING btree (user_id);


--
-- Name: ix_subscription_players_active_by_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subscription_players_active_by_player ON public.subscription_players USING btree (player_id) WHERE (unlinked_at IS NULL);


--
-- Name: ix_subscription_players_active_by_sub; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subscription_players_active_by_sub ON public.subscription_players USING btree (subscription_id) WHERE (unlinked_at IS NULL);


--
-- Name: ix_users_email_ci; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_email_ci ON public.users USING btree (lower(email));


--
-- Name: mm_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mm_created_idx ON public.match_media USING btree (created_at DESC);


--
-- Name: mm_match_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mm_match_idx ON public.match_media USING btree (match_id);


--
-- Name: mm_player_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mm_player_idx ON public.match_media USING btree (player_id);


--
-- Name: mm_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mm_user_idx ON public.match_media USING btree (user_id);


--
-- Name: pc_plan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pc_plan_idx ON public.player_credits USING btree (plan_id);


--
-- Name: pc_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pc_user_idx ON public.player_credits USING btree (user_id);


--
-- Name: pi_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pi_created_idx ON public.player_images USING btree (created_at DESC);


--
-- Name: pi_match_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pi_match_idx ON public.player_images USING btree (match_id);


--
-- Name: pi_player_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pi_player_idx ON public.player_images USING btree (player_id);


--
-- Name: pi_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pi_user_idx ON public.player_images USING btree (user_id);


--
-- Name: players_user_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX players_user_status_idx ON public.players USING btree (user_id, status);


--
-- Name: sc_sport_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sc_sport_idx ON public.sport_categories USING btree (sport_id);


--
-- Name: seasons_year_end_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seasons_year_end_idx ON public.seasons USING btree (year_end);


--
-- Name: seasons_year_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seasons_year_start_idx ON public.seasons USING btree (year_start);


--
-- Name: seasons_year_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX seasons_year_unique ON public.seasons USING btree (year_start, year_end);


--
-- Name: stripe_checkout_fulfillments_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stripe_checkout_fulfillments_user_id_idx ON public.stripe_checkout_fulfillments USING btree (user_id);


--
-- Name: subscription_plans_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_plans_active_idx ON public.subscription_plans USING btree (active);


--
-- Name: subscription_plans_price_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subscription_plans_price_unique ON public.subscription_plans USING btree (stripe_price_id);


--
-- Name: subscription_players_access_code_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_players_access_code_id_idx ON public.subscription_players USING btree (access_code_id);


--
-- Name: subscription_players_player_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_players_player_id_idx ON public.subscription_players USING btree (player_id);


--
-- Name: subscriptions_plan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_plan_id_idx ON public.subscriptions USING btree (plan_id);


--
-- Name: subscriptions_user_end_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_user_end_idx ON public.subscriptions USING btree (user_id, current_period_end);


--
-- Name: subscriptions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_user_idx ON public.subscriptions USING btree (user_id);


--
-- Name: teams_club_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teams_club_idx ON public.teams USING btree (club_id);


--
-- Name: teams_sport_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teams_sport_idx ON public.teams USING btree (sport_id);


--
-- Name: uidx_access_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_access_codes_code ON public.access_codes USING btree (code);


--
-- Name: uq_subscription_players_one_active_pair; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_subscription_players_one_active_pair ON public.subscription_players USING btree (subscription_id, player_id) WHERE (unlinked_at IS NULL);


--
-- Name: uq_subscription_players_one_active_per_player; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_subscription_players_one_active_per_player ON public.subscription_players USING btree (player_id) WHERE (unlinked_at IS NULL);


--
-- Name: uq_subscription_players_sub_player; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_subscription_players_sub_player ON public.subscription_players USING btree (subscription_id, player_id);


--
-- Name: uq_subscriptions_user_accesscode; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_subscriptions_user_accesscode ON public.subscriptions USING btree (user_id, access_code_id) WHERE (access_code_id IS NOT NULL);


--
-- Name: ux_subscriptions_stripe_sid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_subscriptions_stripe_sid ON public.subscriptions USING btree (stripe_subscription_id) WHERE (stripe_subscription_id IS NOT NULL);


--
-- Name: clubs trg_clubs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clubs_updated_at BEFORE UPDATE ON public.clubs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: competitions trg_comp_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_comp_updated_at BEFORE UPDATE ON public.competitions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: competitions trg_competitions_lock_player; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_competitions_lock_player BEFORE UPDATE ON public.competitions FOR EACH ROW EXECUTE FUNCTION public.cmp_lock_player_id();


--
-- Name: competitions trg_competitions_timestamps; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_competitions_timestamps BEFORE INSERT OR UPDATE ON public.competitions FOR EACH ROW EXECUTE FUNCTION public.tg_set_timestamps();


--
-- Name: subscription_players trg_enforce_subscription_capacity_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_subscription_capacity_ins BEFORE INSERT ON public.subscription_players FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_capacity();


--
-- Name: subscription_players trg_enforce_subscription_capacity_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_subscription_capacity_upd BEFORE UPDATE OF unlinked_at, subscription_id ON public.subscription_players FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_capacity();


--
-- Name: player_licenses trg_license_owner; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_license_owner BEFORE INSERT OR UPDATE ON public.player_licenses FOR EACH ROW EXECUTE FUNCTION public.enforce_license_owner();


--
-- Name: matches trg_matches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: matches trg_matches_validate_stats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_matches_validate_stats BEFORE INSERT OR UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public._matches_validate_stats();


--
-- Name: match_media trg_media_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_media_updated_at BEFORE UPDATE ON public.match_media FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: match_media trg_mm_fill_user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mm_fill_user_id BEFORE INSERT ON public.match_media FOR EACH ROW EXECUTE FUNCTION public.mm_fill_user_id();


--
-- Name: match_media trg_mm_lock_user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mm_lock_user_id BEFORE UPDATE ON public.match_media FOR EACH ROW EXECUTE FUNCTION public.mm_lock_user_id();


--
-- Name: match_media trg_mm_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mm_updated_at BEFORE UPDATE ON public.match_media FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payments trg_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: player_licenses trg_pl_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pl_updated_at BEFORE UPDATE ON public.player_licenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: player_seasons trg_player_seasons_timestamps; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_player_seasons_timestamps BEFORE INSERT OR UPDATE ON public.player_seasons FOR EACH ROW EXECUTE FUNCTION public.tg_set_timestamps();


--
-- Name: players trg_players_set_owner; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_players_set_owner BEFORE INSERT OR UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.players_set_owner();


--
-- Name: players trg_players_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: player_seasons trg_ps_lock_player_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ps_lock_player_id BEFORE UPDATE ON public.player_seasons FOR EACH ROW EXECUTE FUNCTION public.ps_lock_player_id();


--
-- Name: player_seasons trg_ps_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ps_updated_at BEFORE UPDATE ON public.player_seasons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: seasons trg_seasons_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_seasons_updated_at BEFORE UPDATE ON public.seasons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: match_media trg_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.match_media FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sport_categories trg_sport_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sport_categories_updated_at BEFORE UPDATE ON public.sport_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sports trg_sports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sports_updated_at BEFORE UPDATE ON public.sports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: teams trg_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users users_enforce_role_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_enforce_role_change BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.users_enforce_role_change_policy();


--
-- Name: access_code_redemptions access_code_redemptions_access_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_code_redemptions
    ADD CONSTRAINT access_code_redemptions_access_code_id_fkey FOREIGN KEY (access_code_id) REFERENCES public.access_codes(id);


--
-- Name: access_code_redemptions access_code_redemptions_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_code_redemptions
    ADD CONSTRAINT access_code_redemptions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id);


--
-- Name: access_code_usages access_code_usages_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_code_usages
    ADD CONSTRAINT access_code_usages_code_id_fkey FOREIGN KEY (code_id) REFERENCES public.access_codes(id) ON DELETE CASCADE;


--
-- Name: access_code_usages access_code_usages_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_code_usages
    ADD CONSTRAINT access_code_usages_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: access_code_usages access_code_usages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_code_usages
    ADD CONSTRAINT access_code_usages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: clubs clubs_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: competitions competitions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT competitions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.sport_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: competitions competitions_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT competitions_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: competitions competitions_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT competitions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: competitions competitions_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT competitions_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;


--
-- Name: competitions competitions_sport_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT competitions_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id);


--
-- Name: competitions competitions_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT competitions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: google_drive_connections google_drive_connections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_drive_connections
    ADD CONSTRAINT google_drive_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: match_media match_media_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_media
    ADD CONSTRAINT match_media_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_media match_media_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_media
    ADD CONSTRAINT match_media_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: match_media match_media_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_media
    ADD CONSTRAINT match_media_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: matches matches_competition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES public.competitions(id) ON DELETE SET NULL;


--
-- Name: matches matches_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: matches matches_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE SET NULL;


--
-- Name: matches matches_sport_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id);


--
-- Name: media_storage_preferences media_storage_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_storage_preferences
    ADD CONSTRAINT media_storage_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: player_credits player_credits_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_credits
    ADD CONSTRAINT player_credits_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: player_credits player_credits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_credits
    ADD CONSTRAINT player_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: player_images player_images_match_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_images
    ADD CONSTRAINT player_images_match_fk FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE SET NULL;


--
-- Name: player_images player_images_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_images
    ADD CONSTRAINT player_images_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_images player_images_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_images
    ADD CONSTRAINT player_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: player_licenses player_licenses_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_licenses
    ADD CONSTRAINT player_licenses_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_licenses player_licenses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_licenses
    ADD CONSTRAINT player_licenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: player_seasons player_seasons_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_seasons
    ADD CONSTRAINT player_seasons_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_seasons player_seasons_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_seasons
    ADD CONSTRAINT player_seasons_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;


--
-- Name: players players_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sport_categories sport_categories_sport_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sport_categories
    ADD CONSTRAINT sport_categories_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id) ON DELETE CASCADE;


--
-- Name: storage_subscriptions storage_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_subscriptions
    ADD CONSTRAINT storage_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.storage_plans(id);


--
-- Name: storage_subscriptions storage_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_subscriptions
    ADD CONSTRAINT storage_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: stripe_checkout_fulfillments stripe_checkout_fulfillments_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_checkout_fulfillments
    ADD CONSTRAINT stripe_checkout_fulfillments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;


--
-- Name: stripe_checkout_fulfillments stripe_checkout_fulfillments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_checkout_fulfillments
    ADD CONSTRAINT stripe_checkout_fulfillments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subscription_players subscription_players_player_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_players
    ADD CONSTRAINT subscription_players_player_fk FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: subscription_players subscription_players_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_players
    ADD CONSTRAINT subscription_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: subscription_players subscription_players_subscription_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_players
    ADD CONSTRAINT subscription_players_subscription_fk FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- Name: subscription_players subscription_players_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_players
    ADD CONSTRAINT subscription_players_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_access_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_access_code_id_fkey FOREIGN KEY (access_code_id) REFERENCES public.access_codes(id) ON DELETE SET NULL;


--
-- Name: subscriptions subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE RESTRICT;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: teams teams_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE SET NULL;


--
-- Name: teams teams_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: teams teams_sport_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id);


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: access_codes ac_sel_any; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ac_sel_any ON public.access_codes FOR SELECT TO authenticated USING (true);


--
-- Name: access_code_redemptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.access_code_redemptions ENABLE ROW LEVEL SECURITY;

--
-- Name: access_code_redemptions access_code_redemptions_no_client_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY access_code_redemptions_no_client_access ON public.access_code_redemptions USING (false) WITH CHECK (false);


--
-- Name: access_code_usages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.access_code_usages ENABLE ROW LEVEL SECURITY;

--
-- Name: access_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: access_code_usages acu_sel_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY acu_sel_own ON public.access_code_usages FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: clubs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

--
-- Name: clubs clubs_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clubs_insert_own ON public.clubs FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = clubs.player_id) AND (p.user_id = auth.uid())))));


--
-- Name: clubs clubs_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clubs_select_own ON public.clubs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = clubs.player_id) AND (p.user_id = auth.uid())))));


--
-- Name: clubs clubs_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clubs_update_own ON public.clubs FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = clubs.player_id) AND (p.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = clubs.player_id) AND (p.user_id = auth.uid())))));


--
-- Name: competitions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

--
-- Name: competitions competitions_insert_own_player; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY competitions_insert_own_player ON public.competitions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = competitions.player_id) AND (p.user_id = auth.uid())))));


--
-- Name: competitions competitions_select_own_player; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY competitions_select_own_player ON public.competitions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = competitions.player_id) AND (p.user_id = auth.uid())))));


--
-- Name: competitions competitions_update_own_player; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY competitions_update_own_player ON public.competitions FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = competitions.player_id) AND (p.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = competitions.player_id) AND (p.user_id = auth.uid())))));


--
-- Name: google_drive_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.google_drive_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: google_drive_connections google_drive_connections_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY google_drive_connections_owner_delete ON public.google_drive_connections FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: google_drive_connections google_drive_connections_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY google_drive_connections_owner_insert ON public.google_drive_connections FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: google_drive_connections google_drive_connections_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY google_drive_connections_owner_select ON public.google_drive_connections FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: google_drive_connections google_drive_connections_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY google_drive_connections_owner_update ON public.google_drive_connections FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: match_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_media ENABLE ROW LEVEL SECURITY;

--
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

--
-- Name: matches matches_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY matches_owner_delete ON public.matches FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = matches.player_id) AND (p.user_id = auth.uid())))));


--
-- Name: matches matches_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY matches_owner_insert ON public.matches FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = matches.player_id) AND (p.user_id = auth.uid())))));


--
-- Name: matches matches_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY matches_owner_select ON public.matches FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = matches.player_id) AND (p.user_id = auth.uid())))));


--
-- Name: matches matches_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY matches_owner_update ON public.matches FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = matches.player_id) AND (p.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = matches.player_id) AND (p.user_id = auth.uid())))));


--
-- Name: media_storage_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.media_storage_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: media_storage_preferences media_storage_preferences_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY media_storage_preferences_owner_insert ON public.media_storage_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: media_storage_preferences media_storage_preferences_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY media_storage_preferences_owner_select ON public.media_storage_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: media_storage_preferences media_storage_preferences_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY media_storage_preferences_owner_update ON public.media_storage_preferences FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: match_media mm_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mm_delete_own ON public.match_media FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.matches m
     JOIN public.players p ON ((p.id = m.player_id)))
  WHERE ((m.id = match_media.match_id) AND (p.user_id = auth.uid())))));


--
-- Name: match_media mm_read_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mm_read_own ON public.match_media FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.matches m
     JOIN public.players p ON ((p.id = m.player_id)))
  WHERE ((m.id = match_media.match_id) AND (p.user_id = auth.uid())))));


--
-- Name: match_media mm_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mm_update_own ON public.match_media FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.matches m
     JOIN public.players p ON ((p.id = m.player_id)))
  WHERE ((m.id = match_media.match_id) AND (p.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.matches m
     JOIN public.players p ON ((p.id = m.player_id)))
  WHERE ((m.id = match_media.match_id) AND (p.user_id = auth.uid())))));


--
-- Name: match_media mm_write_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mm_write_own ON public.match_media FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.matches m
     JOIN public.players p ON ((p.id = m.player_id)))
  WHERE ((m.id = match_media.match_id) AND (p.user_id = auth.uid())))));


--
-- Name: access_code_usages no client access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "no client access" ON public.access_code_usages USING (false) WITH CHECK (false);


--
-- Name: access_codes no client access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "no client access" ON public.access_codes USING (false) WITH CHECK (false);


--
-- Name: sport_categories no client write categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "no client write categories" ON public.sport_categories USING (false) WITH CHECK (false);


--
-- Name: seasons no client write seasons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "no client write seasons" ON public.seasons USING (false) WITH CHECK (false);


--
-- Name: sports no client write sports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "no client write sports" ON public.sports USING (false) WITH CHECK (false);


--
-- Name: subscription_plans no client writes plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "no client writes plans" ON public.subscription_plans USING (false) WITH CHECK (false);


--
-- Name: subscriptions no direct writes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "no direct writes" ON public.subscriptions USING (false) WITH CHECK (false);


--
-- Name: player_credits no direct writes credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "no direct writes credits" ON public.player_credits USING (false) WITH CHECK (false);


--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: payments payments insert service only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "payments insert service only" ON public.payments FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: payments payments select own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "payments select own" ON public.payments FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: payments payments update service only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "payments update service only" ON public.payments FOR UPDATE USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: player_licenses pl_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pl_all ON public.player_licenses USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: player_credits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_credits ENABLE ROW LEVEL SECURITY;

--
-- Name: player_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_images ENABLE ROW LEVEL SECURITY;

--
-- Name: player_images player_images_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY player_images_own ON public.player_images USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: player_licenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_licenses ENABLE ROW LEVEL SECURITY;

--
-- Name: player_seasons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_seasons ENABLE ROW LEVEL SECURITY;

--
-- Name: players; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

--
-- Name: players players_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY players_all ON public.players USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: players players_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY players_insert_own ON public.players FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: players players_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY players_owner_select ON public.players FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: players players_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY players_owner_update ON public.players FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: players players_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY players_select_own ON public.players FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: players players_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY players_update_own ON public.players FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: player_seasons ps_insert_own_players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ps_insert_own_players ON public.player_seasons FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = player_seasons.player_id) AND (p.user_id = auth.uid())))));


--
-- Name: player_seasons ps_select_own_players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ps_select_own_players ON public.player_seasons FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = player_seasons.player_id) AND (p.user_id = auth.uid())))));


--
-- Name: player_seasons ps_update_own_players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ps_update_own_players ON public.player_seasons FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = player_seasons.player_id) AND (p.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = player_seasons.player_id) AND (p.user_id = auth.uid())))));


--
-- Name: subscription_plans public read active plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read active plans" ON public.subscription_plans FOR SELECT USING ((active = true));


--
-- Name: sport_categories public read categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read categories" ON public.sport_categories FOR SELECT USING (true);


--
-- Name: seasons public read seasons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read seasons" ON public.seasons FOR SELECT USING (true);


--
-- Name: sports public read sports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read sports" ON public.sports FOR SELECT USING (true);


--
-- Name: player_credits read own credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read own credits" ON public.player_credits FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: subscriptions read own subs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read own subs" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: seasons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_players sp_ins_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sp_ins_owner ON public.subscription_players FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.subscriptions s
  WHERE ((s.id = subscription_players.subscription_id) AND (s.user_id = auth.uid())))));


--
-- Name: sport_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sport_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: sport_categories sport_categories_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sport_categories_select_all ON public.sport_categories FOR SELECT USING (true);


--
-- Name: sports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;

--
-- Name: sports sports_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sports_select_all ON public.sports FOR SELECT USING (true);


--
-- Name: storage_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.storage_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: storage_plans storage_plans_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY storage_plans_public_read ON public.storage_plans FOR SELECT USING ((active = true));


--
-- Name: storage_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.storage_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: storage_subscriptions storage_subscriptions_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY storage_subscriptions_owner ON public.storage_subscriptions USING ((user_id = auth.uid()));


--
-- Name: stripe_checkout_fulfillments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_checkout_fulfillments ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions subs_ins_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subs_ins_owner ON public.subscriptions FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: subscriptions subs_upd_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subs_upd_owner ON public.subscriptions FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: subscription_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_players; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_players ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: sync_user_debug; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sync_user_debug ENABLE ROW LEVEL SECURITY;

--
-- Name: sync_user_debug sync_user_debug_no_client_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sync_user_debug_no_client_access ON public.sync_user_debug USING (false) WITH CHECK (false);


--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: teams teams_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_insert_own ON public.teams FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = teams.player_id) AND (p.user_id = auth.uid())))));


--
-- Name: teams teams_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_select_own ON public.teams FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = teams.player_id) AND (p.user_id = auth.uid())))));


--
-- Name: teams teams_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_update_own ON public.teams FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = teams.player_id) AND (p.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.players p
  WHERE ((p.id = teams.player_id) AND (p.user_id = auth.uid())))));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_backend_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_backend_all ON public.users TO postgres USING (true) WITH CHECK (true);


--
-- Name: users users_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_self ON public.users FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: users users_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own ON public.users FOR SELECT USING ((auth.uid() = id));


--
-- Name: users users_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_own ON public.users FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO auditor;


--
-- Name: FUNCTION _calc_start_for_player(p_user uuid, p_player uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._calc_start_for_player(p_user uuid, p_player uuid) TO anon;
GRANT ALL ON FUNCTION public._calc_start_for_player(p_user uuid, p_player uuid) TO authenticated;
GRANT ALL ON FUNCTION public._calc_start_for_player(p_user uuid, p_player uuid) TO service_role;


--
-- Name: FUNCTION _matches_validate_stats(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._matches_validate_stats() TO anon;
GRANT ALL ON FUNCTION public._matches_validate_stats() TO authenticated;
GRANT ALL ON FUNCTION public._matches_validate_stats() TO service_role;


--
-- Name: FUNCTION _remaining_seats_core(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._remaining_seats_core(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public._remaining_seats_core(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public._remaining_seats_core(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION _validate_membership_consistency(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._validate_membership_consistency() TO anon;
GRANT ALL ON FUNCTION public._validate_membership_consistency() TO authenticated;
GRANT ALL ON FUNCTION public._validate_membership_consistency() TO service_role;


--
-- Name: FUNCTION assign_credit_to_player(p_user_id uuid, p_player_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.assign_credit_to_player(p_user_id uuid, p_player_id uuid) TO anon;
GRANT ALL ON FUNCTION public.assign_credit_to_player(p_user_id uuid, p_player_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.assign_credit_to_player(p_user_id uuid, p_player_id uuid) TO service_role;


--
-- Name: FUNCTION assign_credit_to_player(p_user_id uuid, p_player_id uuid, p_plan_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.assign_credit_to_player(p_user_id uuid, p_player_id uuid, p_plan_id uuid) TO anon;
GRANT ALL ON FUNCTION public.assign_credit_to_player(p_user_id uuid, p_player_id uuid, p_plan_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.assign_credit_to_player(p_user_id uuid, p_player_id uuid, p_plan_id uuid) TO service_role;


--
-- Name: FUNCTION assign_free_seat_to_player(p_user_id uuid, p_player_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.assign_free_seat_to_player(p_user_id uuid, p_player_id uuid) TO anon;
GRANT ALL ON FUNCTION public.assign_free_seat_to_player(p_user_id uuid, p_player_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.assign_free_seat_to_player(p_user_id uuid, p_player_id uuid) TO service_role;


--
-- Name: FUNCTION cmp_lock_player_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cmp_lock_player_id() TO anon;
GRANT ALL ON FUNCTION public.cmp_lock_player_id() TO authenticated;
GRANT ALL ON FUNCTION public.cmp_lock_player_id() TO service_role;


--
-- Name: FUNCTION create_code_subscription(p_code text, p_plan_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_code_subscription(p_code text, p_plan_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.create_code_subscription(p_code text, p_plan_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.create_code_subscription(p_code text, p_plan_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION create_player_and_link_code(p_access_code_id uuid, p_full_name text, p_birthday date, p_status boolean); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_player_and_link_code(p_access_code_id uuid, p_full_name text, p_birthday date, p_status boolean) TO anon;
GRANT ALL ON FUNCTION public.create_player_and_link_code(p_access_code_id uuid, p_full_name text, p_birthday date, p_status boolean) TO authenticated;
GRANT ALL ON FUNCTION public.create_player_and_link_code(p_access_code_id uuid, p_full_name text, p_birthday date, p_status boolean) TO service_role;


--
-- Name: FUNCTION create_player_link_subscription(p_full_name text, p_birthday date, p_status boolean, p_code_text text, p_season_id uuid, p_memberships jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.create_player_link_subscription(p_full_name text, p_birthday date, p_status boolean, p_code_text text, p_season_id uuid, p_memberships jsonb) TO anon;
GRANT ALL ON FUNCTION public.create_player_link_subscription(p_full_name text, p_birthday date, p_status boolean, p_code_text text, p_season_id uuid, p_memberships jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.create_player_link_subscription(p_full_name text, p_birthday date, p_status boolean, p_code_text text, p_season_id uuid, p_memberships jsonb) TO service_role;


--
-- Name: FUNCTION enforce_license_owner(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.enforce_license_owner() TO anon;
GRANT ALL ON FUNCTION public.enforce_license_owner() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_license_owner() TO service_role;


--
-- Name: FUNCTION enforce_subscription_capacity(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.enforce_subscription_capacity() TO anon;
GRANT ALL ON FUNCTION public.enforce_subscription_capacity() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_subscription_capacity() TO service_role;


--
-- Name: FUNCTION ensure_profile(p_user_id uuid, p_email text, p_name text, p_surname text, p_phone text, p_locale text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.ensure_profile(p_user_id uuid, p_email text, p_name text, p_surname text, p_phone text, p_locale text) TO anon;
GRANT ALL ON FUNCTION public.ensure_profile(p_user_id uuid, p_email text, p_name text, p_surname text, p_phone text, p_locale text) TO authenticated;
GRANT ALL ON FUNCTION public.ensure_profile(p_user_id uuid, p_email text, p_name text, p_surname text, p_phone text, p_locale text) TO service_role;


--
-- Name: FUNCTION ensure_profile_server(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.ensure_profile_server() TO anon;
GRANT ALL ON FUNCTION public.ensure_profile_server() TO authenticated;
GRANT ALL ON FUNCTION public.ensure_profile_server() TO service_role;


--
-- Name: FUNCTION fn_sync_user_from_auth(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.fn_sync_user_from_auth() TO anon;
GRANT ALL ON FUNCTION public.fn_sync_user_from_auth() TO authenticated;
GRANT ALL ON FUNCTION public.fn_sync_user_from_auth() TO service_role;


--
-- Name: FUNCTION has_active_access(p_player_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_active_access(p_player_id uuid) TO anon;
GRANT ALL ON FUNCTION public.has_active_access(p_player_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.has_active_access(p_player_id uuid) TO service_role;


--
-- Name: FUNCTION link_player_to_subscription(p_player_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.link_player_to_subscription(p_player_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.link_player_to_subscription(p_player_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.link_player_to_subscription(p_player_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION mm_fill_user_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.mm_fill_user_id() TO anon;
GRANT ALL ON FUNCTION public.mm_fill_user_id() TO authenticated;
GRANT ALL ON FUNCTION public.mm_fill_user_id() TO service_role;


--
-- Name: FUNCTION mm_lock_user_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.mm_lock_user_id() TO anon;
GRANT ALL ON FUNCTION public.mm_lock_user_id() TO authenticated;
GRANT ALL ON FUNCTION public.mm_lock_user_id() TO service_role;


--
-- Name: FUNCTION players_set_owner(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.players_set_owner() TO anon;
GRANT ALL ON FUNCTION public.players_set_owner() TO authenticated;
GRANT ALL ON FUNCTION public.players_set_owner() TO service_role;


--
-- Name: FUNCTION preview_code(p_code text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.preview_code(p_code text) TO anon;
GRANT ALL ON FUNCTION public.preview_code(p_code text) TO authenticated;
GRANT ALL ON FUNCTION public.preview_code(p_code text) TO service_role;


--
-- Name: FUNCTION ps_lock_player_id(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.ps_lock_player_id() TO anon;
GRANT ALL ON FUNCTION public.ps_lock_player_id() TO authenticated;
GRANT ALL ON FUNCTION public.ps_lock_player_id() TO service_role;


--
-- Name: FUNCTION redeem_access_code(p_code text, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.redeem_access_code(p_code text, p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.redeem_access_code(p_code text, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.redeem_access_code(p_code text, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.redeem_access_code(p_code text, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION redeem_access_code_for_player(p_code text, p_user_id uuid, p_player_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.redeem_access_code_for_player(p_code text, p_user_id uuid, p_player_id uuid) TO anon;
GRANT ALL ON FUNCTION public.redeem_access_code_for_player(p_code text, p_user_id uuid, p_player_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.redeem_access_code_for_player(p_code text, p_user_id uuid, p_player_id uuid) TO service_role;


--
-- Name: FUNCTION redeem_code_and_link_player(p_player_id uuid, p_code text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.redeem_code_and_link_player(p_player_id uuid, p_code text) TO anon;
GRANT ALL ON FUNCTION public.redeem_code_and_link_player(p_player_id uuid, p_code text) TO authenticated;
GRANT ALL ON FUNCTION public.redeem_code_and_link_player(p_player_id uuid, p_code text) TO service_role;


--
-- Name: FUNCTION redeem_code_and_link_player(p_player_id uuid, p_code text, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.redeem_code_and_link_player(p_player_id uuid, p_code text, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.redeem_code_and_link_player(p_player_id uuid, p_code text, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.redeem_code_and_link_player(p_player_id uuid, p_code text, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION remaining_seats_for_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.remaining_seats_for_user() TO anon;
GRANT ALL ON FUNCTION public.remaining_seats_for_user() TO authenticated;
GRANT ALL ON FUNCTION public.remaining_seats_for_user() TO service_role;


--
-- Name: FUNCTION remaining_seats_for_user(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.remaining_seats_for_user(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.remaining_seats_for_user(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.remaining_seats_for_user(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION seats_remaining(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.seats_remaining(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.seats_remaining(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.seats_remaining(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.seats_remaining(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: FUNCTION storage_set_owner(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.storage_set_owner() TO anon;
GRANT ALL ON FUNCTION public.storage_set_owner() TO authenticated;
GRANT ALL ON FUNCTION public.storage_set_owner() TO service_role;


--
-- Name: FUNCTION sync_public_user_from_auth(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sync_public_user_from_auth() TO anon;
GRANT ALL ON FUNCTION public.sync_public_user_from_auth() TO authenticated;
GRANT ALL ON FUNCTION public.sync_public_user_from_auth() TO service_role;


--
-- Name: FUNCTION sync_public_user_on_auth_update(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sync_public_user_on_auth_update() TO anon;
GRANT ALL ON FUNCTION public.sync_public_user_on_auth_update() TO authenticated;
GRANT ALL ON FUNCTION public.sync_public_user_on_auth_update() TO service_role;


--
-- Name: FUNCTION tg_set_timestamps(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_set_timestamps() TO anon;
GRANT ALL ON FUNCTION public.tg_set_timestamps() TO authenticated;
GRANT ALL ON FUNCTION public.tg_set_timestamps() TO service_role;


--
-- Name: FUNCTION users_enforce_role_change_policy(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.users_enforce_role_change_policy() TO anon;
GRANT ALL ON FUNCTION public.users_enforce_role_change_policy() TO authenticated;
GRANT ALL ON FUNCTION public.users_enforce_role_change_policy() TO service_role;


--
-- Name: TABLE access_code_redemptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.access_code_redemptions TO anon;
GRANT ALL ON TABLE public.access_code_redemptions TO authenticated;
GRANT ALL ON TABLE public.access_code_redemptions TO service_role;
GRANT SELECT ON TABLE public.access_code_redemptions TO auditor;


--
-- Name: TABLE access_code_usages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.access_code_usages TO anon;
GRANT ALL ON TABLE public.access_code_usages TO authenticated;
GRANT ALL ON TABLE public.access_code_usages TO service_role;
GRANT SELECT ON TABLE public.access_code_usages TO auditor;


--
-- Name: TABLE access_codes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.access_codes TO anon;
GRANT ALL ON TABLE public.access_codes TO authenticated;
GRANT ALL ON TABLE public.access_codes TO service_role;
GRANT SELECT ON TABLE public.access_codes TO auditor;


--
-- Name: TABLE clubs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.clubs TO anon;
GRANT ALL ON TABLE public.clubs TO authenticated;
GRANT ALL ON TABLE public.clubs TO service_role;
GRANT SELECT ON TABLE public.clubs TO auditor;


--
-- Name: TABLE competitions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.competitions TO anon;
GRANT ALL ON TABLE public.competitions TO authenticated;
GRANT ALL ON TABLE public.competitions TO service_role;
GRANT SELECT ON TABLE public.competitions TO auditor;


--
-- Name: TABLE google_drive_connections; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.google_drive_connections TO anon;
GRANT ALL ON TABLE public.google_drive_connections TO authenticated;
GRANT ALL ON TABLE public.google_drive_connections TO service_role;
GRANT SELECT ON TABLE public.google_drive_connections TO auditor;


--
-- Name: TABLE match_media; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.match_media TO anon;
GRANT ALL ON TABLE public.match_media TO authenticated;
GRANT ALL ON TABLE public.match_media TO service_role;
GRANT SELECT ON TABLE public.match_media TO auditor;


--
-- Name: TABLE matches; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.matches TO anon;
GRANT ALL ON TABLE public.matches TO authenticated;
GRANT ALL ON TABLE public.matches TO service_role;
GRANT SELECT ON TABLE public.matches TO auditor;


--
-- Name: TABLE media_storage_preferences; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.media_storage_preferences TO anon;
GRANT ALL ON TABLE public.media_storage_preferences TO authenticated;
GRANT ALL ON TABLE public.media_storage_preferences TO service_role;
GRANT SELECT ON TABLE public.media_storage_preferences TO auditor;


--
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payments TO anon;
GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.payments TO service_role;
GRANT SELECT ON TABLE public.payments TO auditor;


--
-- Name: TABLE player_active_access; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.player_active_access TO anon;
GRANT ALL ON TABLE public.player_active_access TO authenticated;
GRANT ALL ON TABLE public.player_active_access TO service_role;
GRANT SELECT ON TABLE public.player_active_access TO auditor;


--
-- Name: TABLE player_credits; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.player_credits TO anon;
GRANT ALL ON TABLE public.player_credits TO authenticated;
GRANT ALL ON TABLE public.player_credits TO service_role;
GRANT SELECT ON TABLE public.player_credits TO auditor;


--
-- Name: TABLE player_images; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.player_images TO anon;
GRANT ALL ON TABLE public.player_images TO authenticated;
GRANT ALL ON TABLE public.player_images TO service_role;
GRANT SELECT ON TABLE public.player_images TO auditor;


--
-- Name: TABLE player_licenses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.player_licenses TO anon;
GRANT ALL ON TABLE public.player_licenses TO authenticated;
GRANT ALL ON TABLE public.player_licenses TO service_role;
GRANT SELECT ON TABLE public.player_licenses TO auditor;


--
-- Name: TABLE player_seasons; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.player_seasons TO anon;
GRANT ALL ON TABLE public.player_seasons TO authenticated;
GRANT ALL ON TABLE public.player_seasons TO service_role;
GRANT SELECT ON TABLE public.player_seasons TO auditor;


--
-- Name: TABLE players; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.players TO anon;
GRANT ALL ON TABLE public.players TO authenticated;
GRANT ALL ON TABLE public.players TO service_role;
GRANT SELECT ON TABLE public.players TO auditor;


--
-- Name: TABLE seasons; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.seasons TO anon;
GRANT ALL ON TABLE public.seasons TO authenticated;
GRANT ALL ON TABLE public.seasons TO service_role;
GRANT SELECT ON TABLE public.seasons TO auditor;


--
-- Name: TABLE sport_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sport_categories TO anon;
GRANT ALL ON TABLE public.sport_categories TO authenticated;
GRANT ALL ON TABLE public.sport_categories TO service_role;
GRANT SELECT ON TABLE public.sport_categories TO auditor;


--
-- Name: TABLE sports; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sports TO anon;
GRANT ALL ON TABLE public.sports TO authenticated;
GRANT ALL ON TABLE public.sports TO service_role;
GRANT SELECT ON TABLE public.sports TO auditor;


--
-- Name: TABLE storage_plans; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.storage_plans TO anon;
GRANT ALL ON TABLE public.storage_plans TO authenticated;
GRANT ALL ON TABLE public.storage_plans TO service_role;
GRANT SELECT ON TABLE public.storage_plans TO auditor;


--
-- Name: TABLE storage_subscriptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.storage_subscriptions TO anon;
GRANT ALL ON TABLE public.storage_subscriptions TO authenticated;
GRANT ALL ON TABLE public.storage_subscriptions TO service_role;
GRANT SELECT ON TABLE public.storage_subscriptions TO auditor;


--
-- Name: TABLE stripe_checkout_fulfillments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.stripe_checkout_fulfillments TO anon;
GRANT ALL ON TABLE public.stripe_checkout_fulfillments TO authenticated;
GRANT ALL ON TABLE public.stripe_checkout_fulfillments TO service_role;
GRANT SELECT ON TABLE public.stripe_checkout_fulfillments TO auditor;


--
-- Name: TABLE subscription_plans; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.subscription_plans TO anon;
GRANT ALL ON TABLE public.subscription_plans TO authenticated;
GRANT ALL ON TABLE public.subscription_plans TO service_role;
GRANT SELECT ON TABLE public.subscription_plans TO auditor;


--
-- Name: TABLE subscription_plans_view; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.subscription_plans_view TO anon;
GRANT ALL ON TABLE public.subscription_plans_view TO authenticated;
GRANT ALL ON TABLE public.subscription_plans_view TO service_role;
GRANT SELECT ON TABLE public.subscription_plans_view TO auditor;


--
-- Name: TABLE subscription_players; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.subscription_players TO anon;
GRANT ALL ON TABLE public.subscription_players TO authenticated;
GRANT ALL ON TABLE public.subscription_players TO service_role;
GRANT SELECT ON TABLE public.subscription_players TO auditor;


--
-- Name: TABLE subscriptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.subscriptions TO anon;
GRANT ALL ON TABLE public.subscriptions TO authenticated;
GRANT ALL ON TABLE public.subscriptions TO service_role;
GRANT SELECT ON TABLE public.subscriptions TO auditor;


--
-- Name: TABLE sync_user_debug; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sync_user_debug TO anon;
GRANT ALL ON TABLE public.sync_user_debug TO authenticated;
GRANT ALL ON TABLE public.sync_user_debug TO service_role;
GRANT SELECT ON TABLE public.sync_user_debug TO auditor;


--
-- Name: SEQUENCE sync_user_debug_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.sync_user_debug_id_seq TO anon;
GRANT ALL ON SEQUENCE public.sync_user_debug_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.sync_user_debug_id_seq TO service_role;


--
-- Name: TABLE teams; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.teams TO anon;
GRANT ALL ON TABLE public.teams TO authenticated;
GRANT ALL ON TABLE public.teams TO service_role;
GRANT SELECT ON TABLE public.teams TO auditor;


--
-- Name: TABLE user_subscriptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_subscriptions TO anon;
GRANT ALL ON TABLE public.user_subscriptions TO authenticated;
GRANT ALL ON TABLE public.user_subscriptions TO service_role;
GRANT SELECT ON TABLE public.user_subscriptions TO auditor;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;
GRANT SELECT ON TABLE public.users TO auditor;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO auditor;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict h1WeScd4Z1Yw1ucRN5XLnqVNhPViHj9WsGCnLQwU88bfBrdnFPb9qCtfykd22Of

