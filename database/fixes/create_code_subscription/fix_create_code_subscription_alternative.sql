-- VERSIÓN ALTERNATIVA: Usa SQL dinámico para encontrar automáticamente el nombre de la columna
-- Usa esta versión SOLO si la versión principal (fix_create_code_subscription.sql) sigue dando error
-- sobre el nombre de la columna

DROP FUNCTION IF EXISTS public.create_code_subscription(text, uuid);
DROP FUNCTION IF EXISTS public.create_code_subscription(text, uuid, uuid);

CREATE OR REPLACE FUNCTION public.create_code_subscription(
  p_code text,
  p_plan_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
  v_code_column_name text;
  v_sql text;
BEGIN
  -- 1) Obtener usuario
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Usuario no autenticado');
  END IF;

  -- 2) Detectar automáticamente el nombre de la columna del código
  SELECT column_name INTO v_code_column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'access_codes'
    AND column_name IN ('code', 'text', 'code_text')
  ORDER BY CASE column_name
    WHEN 'code' THEN 1
    WHEN 'text' THEN 2
    WHEN 'code_text' THEN 3
  END
  LIMIT 1;

  IF v_code_column_name IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'No se pudo determinar el nombre de la columna del código en access_codes');
  END IF;

  -- 3) Buscar código usando el nombre de columna detectado
  -- NOTA: Según schema real: uso de 'active' (no 'is_active'), 'usage_count' (no 'used_count'), 'num_days' (no 'days')
  -- No hay campo 'expires_at' ni 'seats' en access_codes
  v_sql := format('SELECT * FROM access_codes WHERE %I = $1 AND active = true AND (max_uses IS NULL OR usage_count < max_uses) LIMIT 1', v_code_column_name);
  EXECUTE v_sql USING p_code INTO v_code_row;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Código inválido o expirado');
  END IF;

  -- 4) Verificar uso previo
  IF EXISTS (
    SELECT 1 FROM access_code_usages
    WHERE code_id = v_code_row.id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Este código ya fue utilizado por ti');
  END IF;

  -- 5) Obtener plan
  SELECT * INTO v_plan_row
  FROM subscription_plans
  WHERE id = p_plan_id AND active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Plan no encontrado o inactivo');
  END IF;

  -- 6) Calcular valores
  v_seats := COALESCE(v_code_row.seats, 1);
  v_days := COALESCE(v_code_row.days, v_plan_row.days, 365);

  SELECT MAX(current_period_end) INTO v_current_end
  FROM subscriptions
  WHERE user_id = v_user_id AND current_period_end IS NOT NULL;

  IF v_current_end IS NULL OR v_current_end < now() THEN
    v_new_end := now() + (v_days || ' days')::interval;
  ELSE
    v_new_end := v_current_end + (v_days || ' days')::interval;
  END IF;

  -- 7) Insertar suscripción con status='active'
  INSERT INTO subscriptions (
    user_id,
    plan_id,
    seats,
    status,
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
    'active'::text,
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

  -- 8) Registrar uso del código
  -- NOTA: La columna de timestamp se llama 'created_at' (no 'used_at')
  -- NOTA: player_id puede ser NULL si el código se usa para suscripción general, no para un jugador específico
  INSERT INTO access_code_usages (code_id, user_id, player_id, created_at)
  VALUES (v_code_row.id, v_user_id, NULL, now());

  -- NOTA: El campo se llama 'usage_count' (no 'used_count')
  UPDATE access_codes
  SET usage_count = usage_count + 1
  WHERE id = v_code_row.id;

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

GRANT EXECUTE ON FUNCTION public.create_code_subscription(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_code_subscription(text, uuid, uuid) TO anon;
