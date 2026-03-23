-- CORRECCIÓN INMEDIATA: Solo corrige el error "COALESCE types text and boolean cannot be matched"
-- Ejecuta este script para corregir el problema principal
-- 
-- Este script intenta corregir automáticamente el error, pero si falla,
-- usa la versión manual: fix_create_player_link_subscription_DIRECTO.sql

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
    RAISE EXCEPTION 'Función create_player_link_subscription no encontrada';
  END IF;
  
  -- Aplicar corrección del error principal
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
  
  -- Verificar que se aplicó el cambio
  IF v_corrected_def = v_func_def THEN
    RAISE EXCEPTION 'No se encontró el patrón coalesce(is_active, active). La función puede tener un formato diferente.';
  END IF;
  
  -- Ejecutar la función corregida
  EXECUTE v_corrected_def;
  
  RAISE NOTICE '✅ Función corregida exitosamente';
  RAISE NOTICE 'El error "COALESCE types text and boolean cannot be matched" debería estar resuelto.';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al corregir automáticamente: % - SQL: %. Usa la versión manual: fix_create_player_link_subscription_DIRECTO.sql', SQLERRM, SQLSTATE;
END $$;

-- Verificación final
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'create_player_link_subscription'
      AND COALESCE(p.prosrc, '') ILIKE '%coalesce(is_active%'
  ) THEN
    RAISE EXCEPTION '❌ La función aún contiene coalesce(is_active). Corrección fallida. Usa la versión manual.';
  ELSE
    RAISE NOTICE '✅✅✅ VERIFICACIÓN EXITOSA ✅✅✅';
  END IF;
END $$;
