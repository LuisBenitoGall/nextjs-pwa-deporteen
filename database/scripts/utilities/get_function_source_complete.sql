-- Obtener el código fuente COMPLETO de la función create_player_link_subscription
-- Esto muestra exactamente qué contiene la función para poder corregirla

-- Opción 1: Obtener solo el código fuente (prosrc)
SELECT 
    p.proname AS function_name,
    p.prosrc AS source_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';

-- Opción 2: Obtener la definición completa con pg_get_functiondef
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS full_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';

-- Opción 3: Buscar líneas específicas que contienen el problema
SELECT 
    p.proname AS function_name,
    CASE 
        WHEN p.prosrc ILIKE '%coalesce(is_active, active)%' THEN 'Contiene: coalesce(is_active, active)'
        WHEN p.prosrc ILIKE '%coalesce(is_active%' THEN 'Contiene: coalesce(is_active) (parcial)'
        WHEN p.prosrc ILIKE '%is_active%' THEN 'Contiene: is_active (sin coalesce)'
        ELSE 'No contiene is_active'
    END AS problem_detected,
    length(p.prosrc) AS source_length
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';
