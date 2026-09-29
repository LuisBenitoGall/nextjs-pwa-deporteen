# Migraciones de Base de Datos

Este documento registra todas las migraciones aplicadas a la base de datos del proyecto.

## Migración: Eliminación de campo duplicado `is_active` de `access_codes`

**Fecha**: 2024 (verificar fecha real de aplicación)

**Archivo SQL**: `migrate_remove_is_active_from_access_codes.sql`

### Contexto

La tabla `access_codes` tenía dos campos booleanos redundantes: `active` e `is_active`. Después de una auditoría completa del código y funciones RPC, se confirmó que:

1. **Ninguna función RPC** (`create_code_subscription`, `redeem_access_code_for_player`) usa `is_active`
2. **Todo el código TypeScript/JavaScript** solo referencia `access_codes` a través de RPCs, no consultas directas
3. **Todas las funciones SQL** que consultan `access_codes` usan únicamente `active`
4. **No hay diferencias funcionales** entre `active` e `is_active`

### Cambios Realizados

1. **Verificación previa**: Script `verify_access_codes_fields.sql` confirma ausencia de uso de `is_active`
2. **Sincronización de datos**: Si `is_active` tenía valores `true` distintos a `active`, se sincronizaron a favor de `active`
3. **Eliminación de columna**: Se eliminó la columna `is_active` de la tabla `access_codes`
4. **Actualización de funciones SQL**: Todas las funciones RPC verifican solo `active = true`

### Scripts Relacionados

- **Verificación**: `verify_access_codes_fields.sql` - Verifica uso de ambos campos antes de migración
- **Migración**: `migrate_remove_is_active_from_access_codes.sql` - Ejecuta la eliminación
- **Corrección RPC**: `fix_create_code_subscription.sql` - Función actualizada para usar solo `active`

### Validación Post-Migración

Después de aplicar la migración, se verificó:

- ✅ Función `create_code_subscription` usa solo `active`
- ✅ Función `redeem_access_code_for_player` (si existe) debe verificar uso de `active`
- ✅ No hay errores de compilación en código TypeScript
- ✅ No hay referencias a `is_active` en `access_codes` en ningún archivo del proyecto
- ✅ Documentación actualizada en `openspec/DATABASE_SCHEMA.md` y `openspec/specs/subscriptions/spec.md`

### Rollback

Si es necesario revertir esta migración:

```sql
-- Restaurar columna is_active (NO recomendado, solo en caso de emergencia)
ALTER TABLE access_codes ADD COLUMN is_active boolean DEFAULT true;
UPDATE access_codes SET is_active = active;
```

**Nota**: No se recomienda rollback ya que el campo no tiene uso funcional.

---

## Migración: Corrección de nombres de columnas en `access_codes`

**Fecha**: 2024 (antes de la eliminación de `is_active`)

**Archivo SQL**: `fix_create_code_subscription.sql`

### Contexto

La función RPC `create_code_subscription` estaba usando nombres de columnas incorrectos basados en documentación desactualizada.

### Cambios Realizados

- Corregido uso de `code` (no `code_text`)
- Corregido uso de `usage_count` (no `used_count`)
- Corregido uso de `num_days` (no `days`)
- Eliminadas referencias a campos inexistentes (`expires_at`, `seats`)
- Asegurado uso consistente de `active = true` (no `is_active`)

### Validación

- ✅ Función RPC corrige error "column does not exist"
- ✅ Función RPC cumple con constraint `subscriptions_status_check`
- ✅ Función RPC resuelve ambigüedad de firmas (una sola función con parámetro opcional)

---

*Última actualización: Verificar fecha real de aplicación de migraciones*
