-- Script para obtener y corregir automáticamente create_player_link_subscription
-- Este script obtiene la definición, muestra qué cambiar, y proporciona la versión corregida

-- PARTE 1: Obtener la definición completa
DO $$
BEGIN
  RAISE NOTICE '=== DEFINICIÓN ACTUAL DE LA FUNCIÓN ===';
END $$;

SELECT pg_get_functiondef(oid) AS function_definition
FROM pg_proc 
WHERE proname = 'create_player_link_subscription'
LIMIT 1;

-- PARTE 2: Mostrar específicamente las líneas que usan is_active
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== LÍNEAS QUE USAN is_active EN access_codes ===';
END $$;
DO $$
DECLARE
  v_prosrc text;
  v_line text;
  v_lines text[];
  i int;
BEGIN
  SELECT p.prosrc INTO v_prosrc
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'create_player_link_subscription'
  LIMIT 1;
  
  IF v_prosrc IS NULL THEN
    RAISE NOTICE 'Función no encontrada';
    RETURN;
  END IF;
  
  -- Dividir en líneas
  v_lines := string_to_array(v_prosrc, E'\n');
  
  -- Buscar líneas con is_active y access_codes
  FOR i IN 1..array_length(v_lines, 1) LOOP
    v_line := v_lines[i];
    IF v_line ILIKE '%access_codes%' AND v_line ILIKE '%is_active%' THEN
      RAISE NOTICE 'Línea %: %', i, v_line;
    END IF;
  END LOOP;
END $$;

-- PARTE 3: Intentar corrección automática (VERSIÓN SIMPLE)
-- NOTA: Esta es una versión simplificada. Si la función es compleja, 
-- puede requerir corrección manual

DO $$
DECLARE
  v_func_def text;
  v_corrected_def text;
  v_func_oid oid;
BEGIN
  -- Obtener definición completa
  SELECT p.oid, pg_get_functiondef(p.oid)
  INTO v_func_oid, v_func_def
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'create_player_link_subscription'
  LIMIT 1;
  
  IF v_func_oid IS NULL THEN
    RAISE EXCEPTION 'Función no encontrada';
  END IF;
  
  -- Correcciones básicas (patrones comunes)
  v_corrected_def := v_func_def;
  
  -- Reemplazo 1: access_codes.is_active → access_codes.active
  v_corrected_def := REPLACE(v_corrected_def, 'access_codes.is_active', 'access_codes.active');
  
  -- Reemplazo 2: WHERE ac.is_active (si hay alias)
  v_corrected_def := REPLACE(v_corrected_def, 'ac.is_active', 'ac.active');
  
  -- Reemplazo 3: AND is_active (en contexto de access_codes - más arriesgado)
  -- Solo si la línea contiene "access_codes" y "is_active"
  -- Este es más complejo, lo haremos con regex o de forma manual
  
  -- Reemplazo 4: Otros campos comunes
  v_corrected_def := REPLACE(v_corrected_def, 'code_text', 'code');  -- Si existe
  v_corrected_def := REPLACE(v_corrected_def, 'used_count', 'usage_count');  -- Si existe
  -- NOTA: days → num_days es más arriesgado porque "days" es muy común
  -- Mejor hacerlo manualmente
  
  -- Mostrar la versión corregida
  RAISE NOTICE '=== VERSIÓN CORREGIDA (REVISAR ANTES DE EJECUTAR) ===';
  RAISE NOTICE '%', LEFT(v_corrected_def, 2000);  -- Primeros 2000 caracteres
  
  -- IMPORTANTE: No ejecutamos automáticamente porque puede haber casos edge
  -- El usuario debe revisar y ejecutar manualmente
  RAISE NOTICE '=== INSTRUCCIONES ===';
  RAISE NOTICE '1. Revisa la versión corregida arriba';
  RAISE NOTICE '2. Verifica que los reemplazos sean correctos';
  RAISE NOTICE '3. Si "days" aparece, cámbialo manualmente a "num_days" solo en contextos de access_codes';
  RAISE NOTICE '4. Ejecuta manualmente el CREATE OR REPLACE FUNCTION con las correcciones';
END $$;

-- PARTE 4: Script de verificación post-corrección
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== DESPUÉS DE CORREGIR, EJECUTA ESTO PARA VERIFICAR ===';
END $$;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'create_player_link_subscription'
        AND COALESCE(p.prosrc, '') ILIKE '%access_codes%'
        AND COALESCE(p.prosrc, '') ILIKE '%is_active%'
    ) THEN '❌ AÚN USA is_active - CORRECCIÓN INCOMPLETA'
    ELSE '✅ CORRECCIÓN EXITOSA - Ya no usa is_active'
  END AS verification_result;
