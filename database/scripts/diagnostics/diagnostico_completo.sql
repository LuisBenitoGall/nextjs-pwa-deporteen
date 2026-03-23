-- DIAGNÓSTICO COMPLETO: Obtener toda la información necesaria para corregir la función
-- Ejecuta este script y comparte los resultados

-- ============================================================
-- 1. ESTRUCTURA DE LA TABLA access_codes
-- ============================================================
-- Esto nos dirá qué columnas tiene realmente la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'access_codes'
ORDER BY ordinal_position;

-- ============================================================
-- 2. CÓDIGO FUENTE COMPLETO DE LA FUNCIÓN
-- ============================================================
-- Obtener el código fuente actual completo (prosrc)
SELECT 
    p.proname AS function_name,
    p.prosrc AS source_code_completo
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';

-- ============================================================
-- 3. DEFINICIÓN COMPLETA DE LA FUNCIÓN (con pg_get_functiondef)
-- ============================================================
-- Esto incluye CREATE FUNCTION completo
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS definicion_completa
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';

-- ============================================================
-- 4. BÚSQUEDA ESPECÍFICA DEL PROBLEMA
-- ============================================================
-- Buscar exactamente dónde está coalesce(is_active) en el código
SELECT 
    p.proname AS function_name,
    CASE 
        WHEN p.prosrc ILIKE '%coalesce(is_active, active)%' THEN 'Contiene: coalesce(is_active, active)'
        WHEN p.prosrc ILIKE '%coalesce(is_active%' THEN 'Contiene: coalesce(is_active) (parcial)'
        WHEN p.prosrc ILIKE '%is_active%' THEN 'Contiene: is_active (sin coalesce)'
        ELSE 'No contiene is_active'
    END AS problema_detectado,
    -- Mostrar las líneas relevantes
    substring(p.prosrc, 1, 500) AS primeras_500_caracteres
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';

-- ============================================================
-- 5. VERIFICAR QUÉ COLUMNAS SE USAN EN LA FUNCIÓN
-- ============================================================
-- Buscar referencias a access_codes en el código fuente
SELECT 
    CASE 
        WHEN p.prosrc ILIKE '%access_codes%' THEN 'La función usa la tabla access_codes'
        ELSE 'La función NO usa access_codes'
    END AS usa_access_codes,
    CASE 
        WHEN p.prosrc ILIKE '%active%' THEN 'La función usa "active"'
        ELSE 'La función NO usa "active"'
    END AS usa_active,
    CASE 
        WHEN p.prosrc ILIKE '%is_active%' THEN 'La función usa "is_active"'
        ELSE 'La función NO usa "is_active"'
    END AS usa_is_active
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';
