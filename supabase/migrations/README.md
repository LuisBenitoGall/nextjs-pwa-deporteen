# Migraciones Supabase (DeporTeen)

Este repositorio contiene **parches incrementales** en `supabase/migrations/`, no un volcado inicial (`CREATE TABLE`) del núcleo histórico.

## Implicaciones (MED-11)

- Clonar el repo **no** reproduce una base vacía lista para desarrollo sin acceso al proyecto Supabase de referencia.
- Los agentes y CI validan comportamiento leyendo código + migraciones, no aplicándolas en bloque sin credenciales.

## Práctica recomendada

1. Mantener cada cambio de esquema en un archivo SQL fechado en `supabase/migrations/`.
2. Documentar en el change OpenSpec correspondiente cualquier RPC/RLS nueva.
3. En entornos reales, aplicar migraciones con la CLI de Supabase vinculada al proyecto.

## Baseline completo

Generar un baseline fiable requiere `supabase db dump` (o export del panel) contra la BD de staging/producción. Eso queda **fuera del alcance** de los agentes sin credenciales.
