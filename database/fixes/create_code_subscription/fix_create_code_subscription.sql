-- Corrección de la función RPC create_code_subscription
-- Esta función debe insertar status='active' para cumplir con el constraint subscriptions_status_check
-- PRIMERO: Eliminar todas las versiones existentes para evitar conflictos
DROP FUNCTION IF EXISTS public.create_code_subscription(text, uuid);
DROP FUNCTION IF EXISTS public.create_code_subscription(text, uuid, uuid);

-- Crear una sola versión que acepte p_user_id como opcional
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

-- Permisos: permitir ejecución a usuarios autenticados
-- Nota: PostgreSQL permite llamar la función con 2 o 3 parámetros gracias al DEFAULT
-- Los permisos se aplican a la función completa independientemente del número de parámetros
GRANT EXECUTE ON FUNCTION public.create_code_subscription(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_code_subscription(text, uuid, uuid) TO anon;
