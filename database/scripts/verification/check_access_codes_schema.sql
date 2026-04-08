-- Script para verificar el nombre real de la columna en access_codes
-- Ejecuta esto primero para saber qué nombre de columna usar

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'access_codes'
ORDER BY ordinal_position;
