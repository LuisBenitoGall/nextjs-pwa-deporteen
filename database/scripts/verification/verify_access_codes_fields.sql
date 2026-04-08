-- Script de verificación: Comprobar uso de 'active' vs 'is_active' en access_codes
-- Este script verifica:
-- 1. Si existe la función redeem_access_code_for_player y qué campos usa
-- 2. Si hay otros objetos (triggers, views, funciones) que usen is_active en access_codes
-- 3. Datos actuales para ver si active e is_active tienen valores distintos

-- 1) Buscar función redeem_access_code_for_player y su definición
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'redeem_access_code_for_player';

-- 2) Buscar todas las funciones que referencian access_codes
SELECT DISTINCT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%access_codes%'
ORDER BY p.proname;

-- 3) Buscar uso de 'is_active' en funciones relacionadas con access_codes
SELECT DISTINCT
    p.proname AS function_name,
    'Referencias a is_active en access_codes' AS note
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%access_codes%'
  AND pg_get_functiondef(p.oid) ILIKE '%is_active%'
ORDER BY p.proname;

-- 4) Buscar uso de 'active' en funciones relacionadas con access_codes
SELECT DISTINCT
    p.proname AS function_name,
    'Referencias a active en access_codes' AS note
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%access_codes%'
  AND (pg_get_functiondef(p.oid) ILIKE '%active%' OR pg_get_functiondef(p.oid) ILIKE '%\.active%')
ORDER BY p.proname;

-- 5) Verificar si hay datos con valores distintos en active vs is_active
SELECT 
    COUNT(*) AS total_rows,
    COUNT(*) FILTER (WHERE active = true AND is_active = true) AS both_true,
    COUNT(*) FILTER (WHERE active = true AND is_active = false) AS active_true_is_active_false,
    COUNT(*) FILTER (WHERE active = false AND is_active = true) AS active_false_is_active_true,
    COUNT(*) FILTER (WHERE active = false AND is_active = false) AS both_false,
    COUNT(*) FILTER (WHERE active IS DISTINCT FROM is_active) AS different_values
FROM access_codes;

-- 6) Buscar triggers que usen access_codes
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'access_codes'::regclass
  AND NOT tgisinternal;

-- 7) Buscar views que usen access_codes
SELECT 
    table_name AS view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND view_definition ILIKE '%access_codes%';
