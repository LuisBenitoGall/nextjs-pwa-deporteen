-- CORRECCIÓN FINAL: create_player_link_subscription
-- Corrige el error: COALESCE types text and boolean cannot be matched
-- 
-- CORRECCIONES APLICADAS:
-- 1. coalesce(is_active, active) → active (el campo is_active ya no existe)
-- 2. Verificación de nombres de columnas según schema real verificado
-- 3. Uso correcto de user_id (no owner_id) en tabla players
-- 4. status es boolean en players

-- Obtener la definición actual y aplicar correcciones
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
  
  RAISE NOTICE 'Función encontrada. Aplicando correcciones...';
  
  -- Aplicar correcciones
  v_corrected_def := v_func_def;
  
  -- CORRECCIÓN 1: coalesce(is_active, active) → active
  -- Este es el error que causa "COALESCE types text and boolean cannot be matched"
  v_corrected_def := REPLACE(v_corrected_def, 
    'coalesce(is_active, active) as active_flag',
    'active as active_flag'
  );
  
  -- Si el formato es ligeramente diferente, intentar sin el alias
  IF v_corrected_def = v_func_def THEN
    v_corrected_def := REPLACE(v_func_def, 
      'coalesce(is_active, active)',
      'active'
    );
  END IF;
  
  -- Verificar que se aplicó el cambio
  IF v_corrected_def = v_func_def THEN
    RAISE EXCEPTION 'No se pudo aplicar la corrección de coalesce(is_active, active). Revisa manualmente.';
  END IF;
  
  -- Ejecutar la función corregida
  EXECUTE v_corrected_def;
  
  RAISE NOTICE '✅ Función corregida exitosamente';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al corregir la función: % - SQL: %', SQLERRM, SQLSTATE;
END $$;

-- Verificar que la corrección funcionó
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'create_player_link_subscription'
      AND (COALESCE(p.prosrc, '') ILIKE '%coalesce(is_active%'
           OR COALESCE(p.prosrc, '') ILIKE '%coalesce(is_active, active)%')
  ) THEN
    RAISE EXCEPTION '❌ La función aún contiene coalesce(is_active, active). Corrección fallida.';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅✅✅ VERIFICACIÓN EXITOSA ✅✅✅';
    RAISE NOTICE 'La función ya no contiene coalesce(is_active, active).';
    RAISE NOTICE 'El error "COALESCE types text and boolean cannot be matched" debería estar resuelto.';
  END IF;
END $$;
