-- CORRECCIÓN DIRECTA: Ejecuta este script completo
-- Solo cambia: coalesce(is_active, active) → active

-- NOTA: Necesitas la definición completa. Si no funciona, sigue estos pasos:
-- 1. Ejecuta: SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'create_player_link_subscription';
-- 2. Copia el resultado completo
-- 3. Busca y reemplaza: coalesce(is_active, active) as active_flag → active as active_flag  
-- 4. Ejecuta el CREATE OR REPLACE FUNCTION completo resultante

-- Este script intenta hacer la corrección automáticamente:
DO $$
DECLARE
  v_full_def text;
  v_corrected text;
BEGIN
  -- Obtener definición completa
  SELECT pg_get_functiondef(oid)
  INTO v_full_def
  FROM pg_proc 
  WHERE proname = 'create_player_link_subscription';
  
  IF v_full_def IS NULL THEN
    RAISE EXCEPTION 'Función no encontrada';
  END IF;
  
  -- Aplicar corrección exacta
  v_corrected := REPLACE(v_full_def, 
    'coalesce(is_active, active) as active_flag',
    'active as active_flag'
  );
  
  -- Si no cambió, el formato puede ser diferente - mostrar error
  IF v_corrected = v_full_def THEN
    RAISE EXCEPTION 'No se encontró el patrón exacto. Busca manualmente "coalesce(is_active, active)" y reemplázalo por "active"';
  END IF;
  
  -- Ejecutar la función corregida
  EXECUTE v_corrected;
  
  RAISE NOTICE '✅ Función corregida exitosamente';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error: % - SQL: %', SQLERRM, SQLSTATE;
END $$;

-- Verificar que la corrección funcionó
DO $$
DECLARE
  v_still_has_is_active boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'create_player_link_subscription'
      AND (COALESCE(p.prosrc, '') ILIKE '%is_active%' 
           OR COALESCE(p.prosrc, '') ILIKE '%coalesce(is_active%')
  ) INTO v_still_has_is_active;
  
  IF v_still_has_is_active THEN
    RAISE EXCEPTION '❌ La función aún contiene referencias a is_active. Revisa manualmente.';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅✅✅ VERIFICACIÓN EXITOSA ✅✅✅';
    RAISE NOTICE 'La función ya no usa is_active.';
    RAISE NOTICE '';
    RAISE NOTICE 'SIGUIENTE PASO:';
    RAISE NOTICE 'Ejecuta ahora: migrate_remove_is_active_from_access_codes.sql';
  END IF;
END $$;
