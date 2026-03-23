-- Script de migración: Eliminar campo duplicado 'is_active' de access_codes
-- 
-- IMPORTANTE: 
-- 1. PRIMERO ejecuta get_create_player_link_subscription_definition.sql para obtener la definición
-- 2. Luego ejecuta fix_create_player_link_subscription.sql para corregir la función
-- 3. Finalmente ejecuta este script para eliminar la columna
--
-- Este script:
-- 1. Verifica que no haya funciones que usen is_active (y se detiene si encuentra alguna)
-- 2. Si active e is_active tienen valores distintos, sincroniza antes de eliminar
-- 3. Elimina la columna is_active de access_codes
--
-- PASO 0: ADVERTENCIA - Si encuentra funciones usando is_active, debes corregirlas primero
-- PASO 1: Verificar uso de is_active (si devuelve resultados, debes corregir las funciones primero)
DO $$
DECLARE
  v_usage_count integer;
  v_func_name text;
  v_func_record record;
BEGIN
  -- Buscar funciones que usen is_active en access_codes
  -- Usamos prosrc (código fuente) que es más confiable que pg_get_functiondef
  v_usage_count := 0;
  v_func_name := '';
  
  -- Buscar en el código fuente de las funciones PL/pgSQL y SQL
  FOR v_func_record IN
    SELECT p.proname, p.prosrc
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND COALESCE(p.prosrc, '') ILIKE '%access_codes%'
      AND COALESCE(p.prosrc, '') ILIKE '%is_active%'
  LOOP
    v_usage_count := v_usage_count + 1;
    IF v_func_name != '' THEN
      v_func_name := v_func_name || ', ';
    END IF;
    v_func_name := v_func_name || v_func_record.proname;
  END LOOP;
  
  IF v_usage_count > 0 THEN
    RAISE EXCEPTION 'Se encontraron % funciones que usan is_active en access_codes: %. Revisa primero estas funciones antes de eliminar la columna.', v_usage_count, v_func_name;
  END IF;
  
  RAISE NOTICE 'Verificación pasada: No se encontraron funciones usando is_active en access_codes';
END $$;

-- PASO 2: Sincronizar valores si son distintos (conservar active como fuente de verdad)
-- Si is_active tiene valores distintos a active, actualizar active con los valores de is_active
-- donde is_active sea true y active sea false (caso donde is_active podría tener más información)
UPDATE access_codes
SET active = is_active
WHERE active IS DISTINCT FROM is_active
  AND is_active = true;

-- PASO 3: Verificar si quedan diferencias después de la sincronización
DO $$
DECLARE
  v_diff_count integer;
BEGIN
  SELECT COUNT(*) INTO v_diff_count
  FROM access_codes
  WHERE active IS DISTINCT FROM is_active;
  
  IF v_diff_count > 0 THEN
    RAISE WARNING 'Quedan % filas con valores distintos entre active e is_active. Se usará active como fuente de verdad.', v_diff_count;
  ELSE
    RAISE NOTICE 'Sincronización completa: Todos los valores están sincronizados';
  END IF;
END $$;

-- PASO 4: Eliminar la columna is_active
-- NOTA: Si la columna tiene dependencias (constraints, índices), se eliminarán automáticamente
ALTER TABLE access_codes DROP COLUMN IF EXISTS is_active;

-- PASO 5: Verificar que la columna se eliminó correctamente
DO $$
DECLARE
  v_column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'access_codes'
      AND column_name = 'is_active'
  ) INTO v_column_exists;
  
  IF v_column_exists THEN
    RAISE EXCEPTION 'La columna is_active aún existe después de intentar eliminarla';
  ELSE
    RAISE NOTICE 'Migración completada: La columna is_active ha sido eliminada exitosamente';
  END IF;
END $$;

-- PASO 6: Crear comentario documentando el cambio
DO $$
DECLARE
  v_comment_text text;
BEGIN
  v_comment_text := 'Indica si el código está activo y disponible para uso. Único campo booleano de estado después de la migración que eliminó is_active (fecha: ' || TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') || ')';
  EXECUTE format('COMMENT ON COLUMN access_codes.active IS %L', v_comment_text);
  RAISE NOTICE 'Comentario agregado exitosamente a la columna active';
END $$;
