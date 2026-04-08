-- Obtener el código fuente COMPLETO de la función
-- Ejecuta este query y comparte el resultado del campo source_code_completo

SELECT 
    p.prosrc AS source_code_completo
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';

-- Si el resultado es muy largo, también puedes obtener solo la parte relevante:
-- Buscar las líneas que contienen "coalesce" o "is_active" o "active"
SELECT 
    p.proname,
    -- Extraer líneas relevantes usando regex o substring
    CASE 
        WHEN p.prosrc ILIKE '%coalesce(is_active%' THEN 
            substring(p.prosrc from position('coalesce' in lower(p.prosrc)) - 50 for 200)
        ELSE 'No se encontró coalesce(is_active)'
    END AS linea_problematica
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';
