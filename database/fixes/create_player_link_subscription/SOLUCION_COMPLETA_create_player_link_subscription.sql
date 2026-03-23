-- SOLUCIÓN COMPLETA: Corrección automática de create_player_link_subscription
-- Este script obtiene la definición completa y aplica la corrección automáticamente

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
  
  RAISE NOTICE 'Función encontrada. Aplicando corrección...';
  
  -- Aplicar corrección: cambiar coalesce(is_active, active) por solo active
  -- La línea problemática es: coalesce(is_active, active) as active_flag
  -- Debe quedar: active as active_flag
  v_corrected_def := REPLACE(v_func_def, 
    'coalesce(is_active, active) as active_flag',
    'active as active_flag'
  );
  
  -- Verificar que se hizo el cambio
  IF v_corrected_def = v_func_def THEN
    -- Si no cambió, puede ser que el formato sea ligeramente diferente
    -- Intentar otros patrones
    v_corrected_def := REPLACE(v_func_def, 
      'coalesce(is_active, active)',
      'active'
    );
  END IF;
  
  -- Ejecutar la función corregida
  EXECUTE v_corrected_def;
  
  RAISE NOTICE '✅ Función corregida exitosamente';
  
  -- Verificar que ya no usa is_active
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'create_player_link_subscription'
      AND COALESCE(p.prosrc, '') ILIKE '%access_codes%'
      AND COALESCE(p.prosrc, '') ILIKE '%is_active%'
  ) THEN
    RAISE WARNING 'La función aún puede contener referencias a is_active. Revisa manualmente.';
  ELSE
    RAISE NOTICE '✅ Verificación: La función ya no usa is_active en access_codes';
    RAISE NOTICE 'Ahora puedes ejecutar migrate_remove_is_active_from_access_codes.sql';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al corregir la función: % - %', SQLSTATE, SQLERRM;
END $$;
