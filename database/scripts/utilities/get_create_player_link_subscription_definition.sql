-- Script para obtener la definición completa de create_player_link_subscription
-- Ejecuta esto primero para ver qué necesita ser corregido

SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_functiondef(p.oid) AS full_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';

-- También obtener el código fuente directo
SELECT 
    p.proname AS function_name,
    p.prosrc AS source_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';
