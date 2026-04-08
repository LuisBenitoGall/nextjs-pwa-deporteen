-- Script de verificación: Ejecuta esto DESPUÉS de corregir la función

-- Verificar que ya no usa is_active
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'create_player_link_subscription'
        AND COALESCE(p.prosrc, '') ILIKE '%access_codes%'
        AND (COALESCE(p.prosrc, '') ILIKE '%is_active%' 
             OR COALESCE(p.prosrc, '') ILIKE '%coalesce(is_active%')
    ) THEN '❌ AÚN USA is_active - CORRECCIÓN INCOMPLETA'
    ELSE '✅ CORRECCIÓN EXITOSA - Ya no usa is_active'
  END AS resultado_verificacion;

-- Mostrar el código actual para revisar manualmente
SELECT 
  p.proname,
  CASE 
    WHEN COALESCE(p.prosrc, '') ILIKE '%coalesce(is_active%' THEN '⚠️ TODAVÍA CONTIENE coalesce(is_active)'
    WHEN COALESCE(p.prosrc, '') ILIKE '%is_active%' THEN '⚠️ TODAVÍA CONTIENE is_active'
    ELSE '✅ NO CONTIENE is_active'
  END AS estado
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription';
