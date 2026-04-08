-- CORRECCIÓN MANUAL SIMPLE: create_player_link_subscription
-- 
-- INSTRUCCIONES:
-- 1. Ejecuta esto para obtener la definición completa:
--    SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'create_player_link_subscription';
--
-- 2. Copia TODO el resultado (desde CREATE OR REPLACE FUNCTION hasta el final)
--
-- 3. Busca esta línea exacta:
--    coalesce(is_active, active) as active_flag
--
-- 4. Reemplázala por:
--    active as active_flag
--
-- 5. Ejecuta el CREATE OR REPLACE FUNCTION completo con ese cambio

-- ============================================
-- CORRECCIÓN AUTOMÁTICA INTENTO (puede fallar)
-- ============================================

DO $$
DECLARE
  v_func_def text;
  v_corrected_def text;
BEGIN
  -- Obtener definición
  SELECT pg_get_functiondef(oid)
  INTO v_func_def
  FROM pg_proc 
  WHERE proname = 'create_player_link_subscription';
  
  IF v_func_def IS NULL THEN
    RAISE EXCEPTION 'Función no encontrada. Verifica el nombre.';
  END IF;
  
  -- Aplicar corrección
  v_corrected_def := REPLACE(v_func_def, 
    'coalesce(is_active, active) as active_flag',
    'active as active_flag'
  );
  
  -- Si no cambió, intentar sin el alias
  IF v_corrected_def = v_func_def THEN
    v_corrected_def := REPLACE(v_func_def, 
      'coalesce(is_active, active)',
      'active'
    );
  END IF;
  
  -- Mostrar la corrección (primeros 5000 caracteres)
  RAISE NOTICE '=== VERSIÓN CORREGIDA (PRIMEROS 5000 CARACTERES) ===';
  RAISE NOTICE '%', LEFT(v_corrected_def, 5000);
  
  RAISE NOTICE '';
  RAISE NOTICE '=== INSTRUCCIONES ===';
  RAISE NOTICE '1. Copia la versión completa desde el mensaje anterior (puede estar truncada)';
  RAISE NOTICE '2. O mejor: Ejecuta manualmente el reemplazo en la definición completa';
  RAISE NOTICE '3. Cambia: coalesce(is_active, active) → active';
  RAISE NOTICE '4. Ejecuta el CREATE OR REPLACE FUNCTION resultante';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error al obtener definición automáticamente: %', SQLERRM;
    RAISE NOTICE 'Usa el método manual: SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = ''create_player_link_subscription'';';
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
