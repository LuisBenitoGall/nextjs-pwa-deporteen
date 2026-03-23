-- CORRECCIÓN DIRECTA: Solo cambia la línea problemática
-- Este script modifica directamente el código fuente (prosrc) de la función

DO $$
DECLARE
  v_oid oid;
  v_prosrc text;
  v_new_prosrc text;
  v_func_def text;
  v_new_func_def text;
BEGIN
  -- Buscar la función
  SELECT p.oid, p.prosrc, pg_get_functiondef(p.oid)
  INTO v_oid, v_prosrc, v_func_def
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'create_player_link_subscription'
  LIMIT 1;
  
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'Función no encontrada';
  END IF;
  
  -- Corregir el código fuente
  v_new_prosrc := REPLACE(v_prosrc, 
    'coalesce(is_active, active) as active_flag',
    'active as active_flag'
  );
  
  -- Si no cambió (formato diferente), intentar sin el alias
  IF v_new_prosrc = v_prosrc THEN
    v_new_prosrc := REPLACE(v_prosrc, 'coalesce(is_active, active)', 'active');
  END IF;
  
  -- Verificar que cambió
  IF v_new_prosrc = v_prosrc THEN
    RAISE EXCEPTION 'No se pudo encontrar el patrón a reemplazar. Usa corrección manual.';
  END IF;
  
  -- Reconstruir la definición completa con el código corregido
  -- Extraer la cabecera de la función
  v_new_func_def := regexp_replace(
    v_func_def,
    'AS \$\$.*\$\$;',
    'AS $$_CORRECTED_CODE_$$;',
    'n'
  );
  
  -- Reemplazar el marcador con el código corregido
  v_new_func_def := REPLACE(v_new_func_def, '$_CORRECTED_CODE_$', v_new_prosrc);
  
  -- Ejecutar la función corregida
  EXECUTE v_new_func_def;
  
  RAISE NOTICE '✅ Función corregida exitosamente';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error en corrección automática: %', SQLERRM;
    RAISE NOTICE 'Usa corrección manual: Cambia coalesce(is_active, active) por active en la definición completa';
    RAISE NOTICE 'Luego ejecuta el CREATE OR REPLACE FUNCTION resultante';
END $$;

-- Verificar corrección
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'create_player_link_subscription'
      AND COALESCE(p.prosrc, '') ILIKE '%coalesce(is_active, active)%'
  ) THEN
    RAISE EXCEPTION '❌ La función aún contiene coalesce(is_active, active). Corrección fallida.';
  ELSE
    RAISE NOTICE '✅ Verificación: Corrección aplicada correctamente';
    RAISE NOTICE 'Ahora puedes ejecutar migrate_remove_is_active_from_access_codes.sql';
  END IF;
END $$;
