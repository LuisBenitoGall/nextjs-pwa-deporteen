# Especificación de Base de Datos

Este documento contiene la especificación real de las tablas de la base de datos, verificada directamente desde el schema de Supabase.

## Tabla `access_codes`

Tabla que almacena los códigos de acceso canjeables para obtener suscripciones gratuitas.

### Columnas (Schema Real Verificado)

| Nombre | Tipo | Descripción | Restricciones |
|--------|------|-------------|---------------|
| `id` | `uuid` | Identificador único del código | PRIMARY KEY |
| `code` | `text` | El código canjeable que introduce el usuario | UNIQUE, NOT NULL |
| `usage_count` | `integer` | Contador de cuántas veces se ha usado el código | DEFAULT 0 |
| `max_uses` | `integer` | Máximo de usos permitidos | NULLABLE (null = ilimitado) |
| `prescriber` | `text` | Persona o entidad que emitió/prescribió el código | NULLABLE |
| `num_days` | `integer` | Número de días de acceso que otorga el código | NOT NULL |
| `active` | `boolean` | Si el código está activo y disponible para uso | DEFAULT true, NOT NULL |
| `created_at` | `timestamp with time zone` | Fecha y hora de creación del código | DEFAULT now() |

### Notas Importantes

- **La columna del código se llama `code`** (no `code_text` como aparecía en documentación anterior)
- **El contador de usos se llama `usage_count`** (no `used_count`)
- **Los días se llaman `num_days`** (no `days`)
- **No existe el campo `seats`** en access_codes (los códigos siempre otorgan 1 seat por defecto)
- **No existe el campo `expires_at`** en access_codes (la expiración se maneja por otros medios o no existe en este esquema)
- **Campo de estado unificado**: Solo existe `active` (el campo `is_active` fue eliminado por ser redundante - ver migración `migrate_remove_is_active_from_access_codes.sql`)

### Relaciones

- Relacionada con `access_code_usages` mediante `access_code_usages.code_id = access_codes.id`
- Los códigos se validan en funciones RPC como `create_code_subscription`

### Constraints

- `code` debe ser único (UNIQUE constraint)
- `usage_count` no debe exceder `max_uses` (si max_uses no es NULL)

---

## Tabla `access_code_usages` (Schema Real Verificado)

Tabla que registra el uso de códigos por usuario para prevenir uso duplicado.

### Columnas (Schema Real Verificado)

| Nombre | Tipo | Descripción | Restricciones |
|--------|------|-------------|---------------|
| `id` | `uuid` | Identificador único del registro de uso | PRIMARY KEY |
| `code_id` | `uuid` | Referencia al código usado | FOREIGN KEY -> access_codes.id |
| `user_id` | `uuid` | Referencia al usuario que usó el código | FOREIGN KEY -> auth.users.id |
| `player_id` | `uuid` | Referencia al jugador asociado (si aplica) | FOREIGN KEY -> players.id, NULLABLE |
| `created_at` | `timestamp with time zone` | Fecha y hora en que se registró el uso del código | DEFAULT now() |

### Notas Importantes

- **La columna de timestamp se llama `created_at`** (NO `used_at` como aparecía en documentación anterior)
- **Existe el campo `player_id`** que puede ser NULL o referenciar al jugador asociado al uso del código
- Esta tabla registra quién usó qué código y cuándo

### Propósito

- Evitar que un usuario use el mismo código más de una vez (verificación por `user_id` y `code_id`)
- Registrar qué jugador está asociado al uso del código (si aplica mediante `player_id`)
- Auditar cuándo se usó el código (`created_at`)

---

## Tabla `players` (Schema Real Verificado)

Tabla que almacena la información básica de los jugadores/deportistas en el sistema.

### Columnas (Schema Real Verificado)

| Nombre | Tipo | Descripción | Restricciones |
|--------|------|-------------|---------------|
| `id` | `uuid` | Identificador único del jugador | PRIMARY KEY |
| `user_id` | `uuid` | Referencia al usuario propietario de este jugador | FOREIGN KEY -> auth.users.id, NOT NULL |
| `full_name` | `text` | Nombre completo del jugador | NOT NULL |
| `birthday` | `date` | Fecha de nacimiento del jugador | NULLABLE |
| `status` | `boolean` | Estado del jugador (activo/inactivo) | DEFAULT true, NOT NULL |
| `created_at` | `timestamp with time zone` | Fecha y hora en que se creó el registro del jugador | DEFAULT now() |
| `updated_at` | `timestamp with time zone` | Fecha y hora de la última actualización del registro | DEFAULT now() |

### Notas Importantes

- **La columna de usuario propietario se llama `user_id`** (no `owner_id` como podría aparecer en migrations antiguas)
- **El campo `status` es de tipo `boolean`** (true = activo, false = inactivo/soft delete)
- **El campo `birthday` es nullable** (puede ser NULL si no se proporciona fecha de nacimiento)

### Relaciones

- Relacionada con `auth.users` mediante `players.user_id = auth.users.id`
- Relacionada con `access_code_usages` mediante `access_code_usages.player_id = players.id` (opcional, nullable)
- Relacionada con `player_seasons` mediante `player_seasons.player_id = players.id`
- Relacionada con `competitions` mediante `competitions.player_id = players.id`

### Constraints

- `user_id` debe referenciar un usuario existente (FOREIGN KEY constraint)
- RLS (Row Level Security) aplicado: usuarios solo pueden ver/modificar sus propios jugadores

### Propósito

- Almacenar información básica de cada jugador/deportista
- Vincular jugadores a usuarios específicos mediante `user_id`
- Permitir soft delete mediante `status = false`

---

## Tabla `subscriptions` (Schema Real Verificado)

Tabla que almacena las suscripciones de usuarios, ya sea creadas mediante códigos de acceso o mediante pagos de Stripe.

### Columnas (Schema Real Verificado)

| Nombre | Tipo | Descripción | Restricciones |
|--------|------|-------------|---------------|
| `id` | `uuid` | Identificador único de la suscripción | PRIMARY KEY |
| `user_id` | `uuid` | Referencia al usuario propietario de la suscripción | FOREIGN KEY -> auth.users.id, NOT NULL |
| `stripe_customer_id` | `text` | ID del cliente en Stripe (si la suscripción proviene de Stripe) | NULLABLE |
| `stripe_subscription_id` | `text` | ID de la suscripción en Stripe (si proviene de Stripe) | NULLABLE |
| `current_period_end` | `timestamp with time zone` | Fecha y hora de fin del periodo de facturación actual | NULLABLE |
| `cancel_at_period_end` | `boolean` | Indica si la suscripción será cancelada al final del periodo actual | DEFAULT false |
| `created_at` | `timestamp with time zone` | Fecha y hora de creación de la suscripción | DEFAULT now() |
| `updated_at` | `timestamp with time zone` | Fecha y hora de última actualización | DEFAULT now() |
| `access_code_id` | `uuid` | Referencia al código de acceso usado (si la suscripción fue creada con código) | FOREIGN KEY -> access_codes.id, NULLABLE |
| `amount` | `bigint` | Importe en céntimos (ej: 1000 = 10.00 EUR) | DEFAULT 0 |
| `currency` | `text` | Divisa de la suscripción (ej: 'EUR', 'USD') | DEFAULT 'EUR' |
| `seats` | `integer` | Número de asientos/jugadores incluidos en la suscripción | DEFAULT 1 |
| `notified_expiry_7d_at` | `timestamp with time zone` | Fecha y hora en que se envió notificación de expiración a 7 días | NULLABLE |
| `plan_id` | `uuid` | Referencia al plan de suscripción | FOREIGN KEY -> subscription_plans.id, NULLABLE |
| `status` | `text` | Estado de la suscripción según Stripe | CHECK constraint: valores permitidos según Stripe |

### Notas Importantes

- **El campo `status` es de tipo `text`** (NO `boolean` como podría aparecer en código anterior). Los valores válidos según Stripe son: `'active'`, `'trialing'`, `'past_due'`, `'canceled'`, `'unpaid'`, `'incomplete'`, `'incomplete_expired'`, `'paused'`
- **El campo `amount` es de tipo `bigint`** y representa el importe en **céntimos** (ejemplo: 1000 = 10.00 EUR)
- **El campo `access_code_id` existe** y puede ser NULL si la suscripción fue creada mediante Stripe (no mediante código)
- **CHECK constraint**: `status` debe cumplir con `subscriptions_status_check` que valida los valores permitidos según Stripe

### Relaciones

- Relacionada con `auth.users` mediante `subscriptions.user_id = auth.users.id`
- Relacionada con `access_codes` mediante `subscriptions.access_code_id = access_codes.id` (opcional)
- Relacionada con `subscription_plans` mediante `subscriptions.plan_id = subscription_plans.id` (opcional)
- Relacionada con `subscription_players` mediante `subscription_players.subscription_id = subscriptions.id`

### Constraints

- `status` debe cumplir con el CHECK constraint `subscriptions_status_check` que valida valores según Stripe
- `user_id` debe referenciar un usuario existente (FOREIGN KEY constraint)

### Propósito

- Gestionar suscripciones creadas mediante códigos de acceso o pagos de Stripe
- Controlar el número de "seats" (asientos) disponibles para crear jugadores
- Sincronizar estado con Stripe mediante webhooks
- Registrar información de facturación y periodos

---

## Tabla `subscription_players` (Schema Real Verificado)

Tabla de relación entre suscripciones y jugadores, registrando qué jugador está vinculado a qué suscripción y cuándo.

### Columnas (Schema Real Verificado)

| Nombre | Tipo | Descripción | Restricciones |
|--------|------|-------------|---------------|
| `id` | `uuid` | Identificador único del registro de vinculación | PRIMARY KEY |
| `subscription_id` | `uuid` | Referencia a la suscripción | FOREIGN KEY -> subscriptions.id, NOT NULL |
| `player_id` | `uuid` | Referencia al jugador vinculado | FOREIGN KEY -> players.id, NOT NULL |
| `linked_at` | `timestamp with time zone` | Fecha y hora en que se vinculó el jugador a la suscripción | DEFAULT now() |
| `unlinked_at` | `timestamp with time zone` | Fecha y hora en que se desvinculó el jugador de la suscripción (si aplica) | NULLABLE |
| `amount_cents` | `bigint` | Importe en céntimos asociado a este vínculo | DEFAULT 0 |
| `currency` | `text` | Divisa del importe (ej: 'EUR', 'USD') | DEFAULT 'EUR' |
| `created_at` | `timestamp with time zone` | Fecha y hora de creación del registro | DEFAULT now() |
| `source` | `text` | Origen del vínculo: 'code' (código de acceso) o 'stripe' (pago Stripe) | NOT NULL |
| `access_code_id` | `uuid` | Referencia al código de acceso usado (si el vínculo proviene de un código) | FOREIGN KEY -> access_codes.id, NULLABLE |

### Notas Importantes

- **El campo `amount_cents` es de tipo `bigint`** y representa el importe en **céntimos**
- **Existe el campo `unlinked_at`** que permite rastrear cuándo se desvinculó un jugador (soft delete del vínculo)
- **El campo `source`** indica el origen: `'code'` para códigos de acceso o `'stripe'` para pagos
- **El campo `access_code_id` puede ser NULL** si el vínculo no proviene de un código de acceso

### Relaciones

- Relacionada con `subscriptions` mediante `subscription_players.subscription_id = subscriptions.id`
- Relacionada con `players` mediante `subscription_players.player_id = players.id`
- Relacionada con `access_codes` mediante `subscription_players.access_code_id = access_codes.id` (opcional)

### Constraints

- `subscription_id` debe referenciar una suscripción existente (FOREIGN KEY constraint)
- `player_id` debe referenciar un jugador existente (FOREIGN KEY constraint)
- `access_code_id` debe referenciar un código existente si no es NULL (FOREIGN KEY constraint)

### Propósito

- Vincular jugadores a suscripciones específicas
- Rastrear cuándo se vinculó/desvinculó cada jugador
- Registrar el origen del vínculo (código o Stripe)
- Mantener historial de asociaciones jugador-suscripción

---

*Nota: Este documento se actualizará con las especificaciones reales de otras tablas según se vayan verificando.*
