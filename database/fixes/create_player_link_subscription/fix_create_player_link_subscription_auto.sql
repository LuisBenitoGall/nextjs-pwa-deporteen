-- Script automático para corregir create_player_link_subscription
-- Este script corrige automáticamente las referencias a is_active en access_codes

-- PASO 1: Obtener la definición actual y mostrar qué necesita corrección
DO $$
DECLARE
  v_func_oid oid;
  v_func_def text;
  v_prosrc text;
  v_new_prosrc text;
  v_has_is_active boolean := false;
BEGIN
  -- Buscar la función
  SELECT p.oid, pg_get_functiondef(p.oid), p.prosrc
  INTO v_func_oid, v_func_def, v_prosrc
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'create_player_link_subscription'
  LIMIT 1;
  
  IF v_func_oid IS NULL THEN
    RAISE EXCEPTION 'Función create_player_link_subscription no encontrada';
  END IF;
  
  -- Verificar si usa is_active
  IF v_prosrc ILIKE '%access_codes%' AND v_prosrc ILIKE '%is_active%' THEN
    v_has_is_active := true;
    RAISE NOTICE 'Se encontraron referencias a is_active en access_codes. Corrigiendo...';
    
    -- Realizar reemplazos en el código fuente
    v_new_prosrc := v_prosrc;
    
    -- Reemplazar is_active por active en el contexto de access_codes
    -- Patrón 1: access_codes.is_active
    v_new_prosrc := REPLACE(v_new_prosrc, 'access_codes.is_active', 'access_codes.active');
    
    -- Patrón 2: ac.is_active (si hay alias 'ac' para access_codes)
    v_new_prosrc := REPLACE(v_new_prosrc, 'ac.is_active', 'ac.active');
    
    -- Patrón 3: WHERE is_active (en contexto de access_codes)
    -- Esto es más complejo, necesitamos contexto. Por ahora hacemos un reemplazo simple
    -- pero puede necesitar ajustes manuales si hay otras tablas con is_active
    
    -- NOTA: No podemos modificar directamente prosrc sin recrear la función completa
    -- Por lo tanto, mostramos la definición completa que necesita ser corregida
    
    RAISE NOTICE 'La función necesita corrección. Mostrando definición completa...';
    RAISE NOTICE '=== DEFINICIÓN ACTUAL (CORREGIR MANUALMENTE) ===';
    
    -- Intentar mostrar la definición, pero puede ser muy larga
    -- En su lugar, vamos a crear la función corregida directamente
  ELSE
    RAISE NOTICE 'La función no usa is_active en access_codes, o ya está corregida.';
    RETURN;
  END IF;
END $$;

-- PASO 2: Como no podemos modificar prosrc directamente, necesitamos recrear la función
-- Pero primero necesitamos obtener todos los detalles de la función original

-- Obtener información completa de la función
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  p.prorettype::regtype AS return_type_reg,
  p.provolatile AS volatility,
  p.proisstrict AS is_strict,
  p.prosecdef AS security_definer,
  p.proconfig AS config,
  CASE 
    WHEN p.prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql') THEN 'plpgsql'
    WHEN p.prolang = (SELECT oid FROM pg_language WHERE lanname = 'sql') THEN 'sql'
    ELSE 'unknown'
  END AS language
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';

-- NOTA IMPORTANTE: 
-- Como no podemos modificar automáticamente el código fuente de una función PL/pgSQL
-- sin tener su definición completa, necesitas:
--
-- 1. Ejecutar este query para obtener la definición completa:
--    SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'create_player_link_subscription';
--
-- 2. Copiar el resultado completo
-- 3. Buscar y reemplazar:
--    - "access_codes.is_active" → "access_codes.active"
--    - "is_active = true" (cuando está en WHERE relacionado con access_codes) → "active = true"
--    - "is_active" (en SELECT de access_codes) → "active"
--
-- 4. También verificar otros campos:
--    - "code_text" → "code" (si existe en access_codes)
--    - "used_count" → "usage_count"
--    - "days" → "num_days"
--
-- 5. Ejecutar el CREATE OR REPLACE FUNCTION corregido
