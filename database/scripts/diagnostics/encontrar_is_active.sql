-- Encontrar EXACTAMENTE dónde aparece "is_active" en el código
-- Esto mostrará las líneas completas donde aparece

SELECT 
    p.proname,
    -- Dividir el código en líneas y numerarlas
    unnest(string_to_array(p.prosrc, E'\n')) WITH ORDINALITY AS t(linea, numero_linea)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription'
  AND lower(p.prosrc) LIKE '%is_active%'
ORDER BY numero_linea;

-- Alternativa: Mostrar solo las líneas que contienen "is_active"
SELECT 
    p.proname,
    numero_linea,
    linea
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid,
LATERAL unnest(string_to_array(p.prosrc, E'\n')) WITH ORDINALITY AS t(linea, numero_linea)
WHERE n.nspname = 'public'
  AND p.proname = 'create_player_link_subscription'
  AND lower(t.linea) LIKE '%is_active%'
ORDER BY numero_linea;
