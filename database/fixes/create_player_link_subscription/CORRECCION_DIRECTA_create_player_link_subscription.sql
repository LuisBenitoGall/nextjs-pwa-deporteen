-- CORRECCIÓN DIRECTA: Reemplaza la definición completa de create_player_link_subscription
-- 
-- INSTRUCCIONES:
-- 1. Primero ejecuta: SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'create_player_link_subscription';
-- 2. Copia el resultado completo
-- 3. Pégalo en un editor de texto y busca/reemplaza:
--    - "access_codes.is_active" → "access_codes.active"
--    - ".is_active" (en líneas que contengan "access_codes") → ".active"
--    - "WHERE is_active" (en queries de access_codes) → "WHERE active"
--    - "code_text" → "code" (solo en contexto de access_codes)
--    - "used_count" → "usage_count" (solo en contexto de access_codes)
--    - "days" → "num_days" (solo en contexto de access_codes, ten cuidado con esto)
-- 4. Ejecuta el CREATE OR REPLACE FUNCTION resultante

-- ============================================
-- PLANTILLA DE CORRECCIÓN AUTOMÁTICA
-- ============================================
-- Este script intenta corregir automáticamente, pero puede requerir ajustes manuales

DO $$
DECLARE
  v_func_def text;
  v_corrected text;
  v_func_oid oid;
BEGIN
  -- Obtener definición
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
  
  -- Aplicar correcciones (orden específico para evitar conflictos)
  v_corrected := v_func_def;
  
  -- 1. Reemplazos específicos primero
  v_corrected := REPLACE(v_corrected, 'access_codes.is_active', 'access_codes.active');
  v_corrected := REPLACE(v_corrected, 'access_codes.code_text', 'access_codes.code');
  v_corrected := REPLACE(v_corrected, 'access_codes.used_count', 'access_codes.usage_count');
  v_corrected := REPLACE(v_corrected, 'access_codes.days', 'access_codes.num_days');
  
  -- 2. Reemplazos con alias comunes (ac, acs, etc.)
  v_corrected := REPLACE(v_corrected, 'ac.is_active', 'ac.active');
  v_corrected := REPLACE(v_corrected, 'acs.is_active', 'acs.active');
  
  -- 3. Patrones en WHERE clauses (más cuidadoso)
  -- Reemplazar "WHERE is_active" cuando está cerca de "access_codes" (dentro de 50 caracteres)
  -- Esto es más complejo, mejor hacerlo manualmente o con regex
  
  -- 4. Guardar la versión corregida en una tabla temporal para revisión
  -- O mejor, mostrarla para que el usuario la revise
  
  RAISE NOTICE '=== VERSIÓN CORREGIDA (PRIMEROS 3000 CARACTERES) ===';
  RAISE NOTICE '%', LEFT(v_corrected, 3000);
  RAISE NOTICE '';
  RAISE NOTICE '=== INSTRUCCIONES ===';
  RAISE NOTICE '1. Revisa la versión corregida arriba';
  RAISE NOTICE '2. Busca manualmente "WHERE" y verifica que los "is_active" en contexto de access_codes sean "active"';
  RAISE NOTICE '3. Si "days" aparece cerca de access_codes, cámbialo a "num_days"';
  RAISE NOTICE '4. Copia la versión completa corregida y ejecútala como CREATE OR REPLACE FUNCTION';
  
  -- IMPORTANTE: No ejecutamos automáticamente por seguridad
  -- El usuario debe revisar y ejecutar manualmente
  
END $$;

-- ============================================
-- VERIFICACIÓN POST-CORRECCIÓN
-- ============================================
-- Ejecuta esto DESPUÉS de aplicar la corrección manual

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'create_player_link_subscription'
      AND COALESCE(p.prosrc, '') ILIKE '%access_codes%'
      AND COALESCE(p.prosrc, '') ILIKE '%is_active%'
  ) THEN
    RAISE EXCEPTION '❌ La función aún usa is_active. Revisa la corrección.';
  ELSE
    RAISE NOTICE '✅ Verificación exitosa: La función ya no usa is_active en access_codes.';
    RAISE NOTICE 'Ahora puedes ejecutar migrate_remove_is_active_from_access_codes.sql';
  END IF;
END $$;
