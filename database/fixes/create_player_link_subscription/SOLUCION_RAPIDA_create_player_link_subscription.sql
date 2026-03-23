-- SOLUCIÓN RÁPIDA: Script para corregir create_player_link_subscription
-- 
-- INSTRUCCIONES:
-- 1. Ejecuta PRIMERO este query para obtener la definición completa:
--    SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'create_player_link_subscription';
--
-- 2. Copia el resultado completo y pégalo aquí abajo, luego haz los reemplazos indicados
--
-- 3. Reemplaza manualmente en la definición:
--    - "access_codes.is_active" → "access_codes.active"  
--    - ".is_active" → ".active" (en contexto de access_codes)
--    - "WHERE is_active" → "WHERE active" (en queries de access_codes)
--    - También verifica: "code_text" → "code", "used_count" → "usage_count", "days" → "num_days"
--
-- 4. Ejecuta el CREATE OR REPLACE FUNCTION completo resultante

-- ========================================
-- AQUÍ PEGA LA DEFINICIÓN CORREGIDA:
-- ========================================

-- Ejemplo de cómo debería verse (REEMPLAZA con tu definición real corregida):

/*
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
DECLARE
  v_user_id uuid;
  v_player_id uuid;
  v_subscription_id uuid;
  v_code_row record;
  -- ... otras variables
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Si hay código, buscar en access_codes
  IF p_code_text IS NOT NULL THEN
    -- CORREGIR ESTA LÍNEA: cambiar is_active por active
    SELECT * INTO v_code_row
    FROM access_codes
    WHERE code = p_code_text  -- También cambiar code_text por code si existe
      AND active = true        -- CAMBIAR: is_active → active
      AND (max_uses IS NULL OR usage_count < max_uses);  -- CAMBIAR: used_count → usage_count
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Código inválido';
    END IF;
    
    -- ... resto de la lógica
  END IF;

  -- Crear jugador
  INSERT INTO players (owner_id, full_name, status, ...)
  VALUES (v_user_id, p_full_name, p_status, ...)
  RETURNING id INTO v_player_id;

  -- Crear suscripción si hay código
  IF v_code_row IS NOT NULL THEN
    -- Crear suscripción usando v_code_row.num_days  -- CAMBIAR: days → num_days
    -- ...
  END IF;

  RETURN QUERY SELECT v_player_id, v_subscription_id;
END;
$$;
*/

-- ========================================
-- SCRIPT DE VERIFICACIÓN POST-CORRECCIÓN
-- ========================================

-- Después de aplicar la corrección, ejecuta esto para verificar:
DO $$
DECLARE
  v_has_is_active boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'create_player_link_subscription'
      AND COALESCE(p.prosrc, '') ILIKE '%access_codes%'
      AND COALESCE(p.prosrc, '') ILIKE '%is_active%'
  ) INTO v_has_is_active;
  
  IF v_has_is_active THEN
    RAISE EXCEPTION 'La función aún usa is_active. Revisa la corrección.';
  ELSE
    RAISE NOTICE '✅ Verificación exitosa: La función ya no usa is_active en access_codes.';
  END IF;
END $$;
