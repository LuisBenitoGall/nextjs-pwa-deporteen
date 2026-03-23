-- Script simple para obtener la definición de create_player_link_subscription
-- Ejecuta esto primero para ver la función completa

-- Obtener la definición completa de la función
SELECT pg_get_functiondef(oid) AS function_definition
FROM pg_proc 
WHERE proname = 'create_player_link_subscription';

-- También obtener solo el código fuente (prosrc) para análisis
SELECT 
  p.proname AS function_name,
  p.prosrc AS source_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';

-- Buscar líneas específicas que contienen is_active y access_codes
DO $$
DECLARE
  v_prosrc text;
  v_line text;
  v_lines text[];
  i int;
  v_found boolean := false;
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
  
  RAISE NOTICE '=== LÍNEAS QUE CONTIENEN is_active Y access_codes ===';
  
  -- Buscar líneas con is_active y access_codes
  FOR i IN 1..array_length(v_lines, 1) LOOP
    v_line := v_lines[i];
    IF v_line ILIKE '%access_codes%' AND v_line ILIKE '%is_active%' THEN
      v_found := true;
      RAISE NOTICE 'Línea %: %', i, TRIM(v_line);
    END IF;
  END LOOP;
  
  IF NOT v_found THEN
    RAISE NOTICE 'No se encontraron líneas con ambos términos juntos.';
    RAISE NOTICE 'Buscando líneas separadas...';
    
    -- Buscar líneas con is_active (cualquiera)
    FOR i IN 1..array_length(v_lines, 1) LOOP
      v_line := v_lines[i];
      IF v_line ILIKE '%is_active%' THEN
        RAISE NOTICE 'Línea % (contiene is_active): %', i, TRIM(v_line);
      END IF;
    END LOOP;
  END IF;
END $$;
