-- Verificar el código fuente ACTUAL de la función después de aplicar el script
-- Esto nos dirá si el script se aplicó correctamente o si hay otro problema

-- 1. Obtener código fuente completo
SELECT 
    p.proname AS function_name,
    p.prosrc AS codigo_fuente_actual
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';

-- 2. Buscar referencias a subscription_id que puedan ser ambiguas
SELECT 
    p.proname,
    CASE 
        WHEN p.prosrc ILIKE '%subscription_id%' AND NOT p.prosrc ILIKE '%v_subscription_id%' THEN '⚠️ Usa subscription_id sin prefijo v_'
        WHEN p.prosrc ILIKE '%player_id%' AND NOT p.prosrc ILIKE '%v_player_id%' AND NOT p.prosrc ILIKE '%returning id into v_player_id%' THEN '⚠️ Usa player_id sin prefijo v_'
        ELSE '✅ Parece usar variables locales'
    END AS estado_referencias
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';

-- 3. Buscar específicamente la línea problemática del INSERT
SELECT 
    p.proname,
    substring(
        p.prosrc, 
        position('insert into public.subscription_players' in lower(p.prosrc)),
        300
    ) AS insert_statement
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';
