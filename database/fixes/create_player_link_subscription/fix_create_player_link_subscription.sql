-- Script para corregir la función create_player_link_subscription
-- Esta función usa is_active en access_codes y debe cambiarse a active

-- Primero, obtenemos la definición actual para verificar qué necesita corrección
-- NOTA: Este script asume que la función usa is_active en access_codes
-- Si la estructura es diferente, puede necesitar ajustes

-- Obtener la definición actual de la función (para referencia)
DO $$
DECLARE
  v_func_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_func_def
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'create_player_link_subscription'
  LIMIT 1;
  
  IF v_func_def IS NULL THEN
    RAISE NOTICE 'Función create_player_link_subscription no encontrada. Puede que necesites crearla o que tenga otro nombre.';
  ELSE
    RAISE NOTICE 'Definición actual encontrada (primeros 500 caracteres): %', LEFT(v_func_def, 500);
  END IF;
END $$;

-- IMPORTANTE: Antes de ejecutar este script, debes obtener la definición completa
-- de la función desde Supabase y reemplazar todas las referencias a is_active
-- en access_codes con active.

-- Este es un template que muestra el patrón de corrección que necesitas aplicar:
-- Cambiar: access_codes.is_active
-- Por: access_codes.active
-- O cambiar: WHERE is_active = true (si está en un SELECT de access_codes)
-- Por: WHERE active = true

-- NOTA: Como no tenemos la definición exacta de la función aquí, este script
-- intenta hacer una corrección genérica. Si falla, necesitarás:
-- 1. Ejecutar: SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'create_player_link_subscription';
-- 2. Copiar la definición completa
-- 3. Reemplazar manualmente is_active por active donde corresponda
-- 4. Ejecutar el CREATE OR REPLACE FUNCTION resultante

-- Script genérico para actualizar el código fuente si es posible
DO $$
DECLARE
  v_prosrc text;
  v_oid oid;
  v_new_prosrc text;
BEGIN
  -- Buscar la función
  SELECT p.oid, p.prosrc INTO v_oid, v_prosrc
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'create_player_link_subscription'
  LIMIT 1;
  
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'Función create_player_link_subscription no encontrada';
  END IF;
  
  -- Verificar si usa is_active en access_codes
  IF v_prosrc ILIKE '%access_codes%' AND v_prosrc ILIKE '%is_active%' THEN
    -- Reemplazar is_active por active en el contexto de access_codes
    -- Este es un reemplazo simple, puede necesitar ajustes según la estructura exacta
    v_new_prosrc := REPLACE(REPLACE(REPLACE(
      v_prosrc,
      'access_codes.is_active',
      'access_codes.active'
    ), '.is_active =', '.active ='), '.is_active', '.active');
    
    -- IMPORTANTE: No podemos modificar directamente prosrc sin recrear la función
    -- Por lo tanto, mostramos el código que necesita ser corregido
    RAISE NOTICE 'La función usa is_active. Necesitas recrearla manualmente con active.';
    RAISE NOTICE 'Código fuente actual (primeros 1000 caracteres):';
    RAISE NOTICE '%', LEFT(v_prosrc, 1000);
  ELSE
    RAISE NOTICE 'La función no usa is_active en access_codes, o ya está corregida.';
  END IF;
END $$;

-- Como no podemos modificar directamente el prosrc sin recrear la función completa,
-- debes hacer lo siguiente:
-- 
-- 1. Ejecutar este query para obtener la definición completa:
--    SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'create_player_link_subscription';
--
-- 2. Copiar el resultado y buscar/reemplazar:
--    - "is_active" -> "active" (solo en el contexto de access_codes)
--    - Verificar también otros campos: code_text -> code, used_count -> usage_count, days -> num_days
--
-- 3. Ejecutar el CREATE OR REPLACE FUNCTION resultante
