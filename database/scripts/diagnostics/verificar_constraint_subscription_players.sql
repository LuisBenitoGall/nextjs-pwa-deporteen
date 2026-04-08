-- Verificar el constraint único en subscription_players
-- Esto nos dirá qué columnas están en el constraint para el ON CONFLICT

-- 1. Ver constraints UNIQUE en subscription_players
SELECT 
    tc.constraint_name,
    tc.table_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'subscription_players'
  AND tc.constraint_type = 'UNIQUE'
GROUP BY tc.constraint_name, tc.table_name;

-- 2. Ver índices únicos en subscription_players
SELECT 
    i.relname AS index_name,
    string_agg(a.attname, ', ' ORDER BY array_position(ix.indkey, a.attnum)) AS columns
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE t.relkind = 'r'
  AND t.relname = 'subscription_players'
  AND ix.indisunique = true
GROUP BY i.relname
ORDER BY i.relname;

-- 3. Ver todas las columnas de subscription_players
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'subscription_players'
ORDER BY ordinal_position;
