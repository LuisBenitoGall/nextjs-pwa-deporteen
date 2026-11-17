## ADDED Requirements

### Requirement: Baseline reproducible del esquema public

El repositorio SHALL incluir un volcado SQL del esquema `public` que permita crear tablas, vistas, funciones, triggers, políticas RLS y permisos equivalentes al proyecto de referencia, sin datos de usuario.

#### Scenario: Entorno Supabase nuevo

- **WHEN** un operador aplica el bootstrap documentado sobre una base vacía del proyecto
- **THEN** el inventario de objetos en `public` coincide con 27 tablas, 3 vistas, 36 funciones, 67 políticas RLS y 27 triggers

#### Scenario: Proyecto Supabase existente

- **WHEN** la base de referencia ya contiene el esquema en producción/staging
- **THEN** el operador no reaplica el baseline y solo ejecuta migraciones incrementales nuevas vía `supabase db push`
