-- Verificar EXACTAMENTE qué contiene la función
-- Esto nos mostrará el código fuente completo para encontrar el problema

-- 1. Obtener el código fuente completo
SELECT 
    p.proname AS function_name,
    p.prosrc AS codigo_fuente_completo
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';

-- 2. Buscar específicamente dónde aparece "is_active" o "coalesce(is_active"
-- Mostrar el contexto alrededor de esas palabras
SELECT 
    p.proname,
    -- Buscar la posición de "is_active" en el código
    position('is_active' in lower(p.prosrc)) AS posicion_is_active,
    position('coalesce(is_active' in lower(p.prosrc)) AS posicion_coalesce,
    -- Mostrar 100 caracteres antes y después de la posición
    CASE 
        WHEN position('coalesce(is_active' in lower(p.prosrc)) > 0 THEN
            substring(p.prosrc from greatest(1, position('coalesce(is_active' in lower(p.prosrc)) - 100) 
            for 250)
        WHEN position('is_active' in lower(p.prosrc)) > 0 THEN
            substring(p.prosrc from greatest(1, position('is_active' in lower(p.prosrc)) - 100) 
            for 250)
        ELSE 'No se encontró is_active'
    END AS contexto_problematico
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';

-- 3. Contar cuántas veces aparece "is_active" en el código
SELECT 
    p.proname,
    (length(p.prosrc) - length(replace(lower(p.prosrc), 'is_active', ''))) / length('is_active') AS veces_is_active,
    (length(p.prosrc) - length(replace(lower(p.prosrc), 'coalesce(is_active', ''))) / length('coalesce(is_active') AS veces_coalesce,
    (length(p.prosrc) - length(replace(lower(p.prosrc), 'active', ''))) / length('active') AS veces_active
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';
