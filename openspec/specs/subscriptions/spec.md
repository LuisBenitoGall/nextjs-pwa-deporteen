# Suscripciones y Pagos

## Descripción

Sistema de suscripciones con integración de Stripe para gestionar planes de pago, códigos de acceso y renovaciones. Controla el número de "seats" (asientos) disponibles para crear jugadores.

## Requisitos Funcionales

### RF-1: Visualizar Planes de Suscripción

**Descripción**: Usuario puede ver planes de suscripción disponibles.

**Criterios de Aceptación**:
- Acceso a `/subscription` (público o autenticado)
- Visualización de:
  - Plan gratuito (si existe)
  - Planes de pago disponibles
  - Precio, duración, características
  - Selección de cantidad de unidades (seats)
- Aplicación de códigos de descuento
- Redirección a checkout de Stripe o creación directa (modo fake)

**Flujo**:
1. Usuario accede a página de suscripción
2. Sistema carga planes desde BD (`subscription_plans`)
3. Usuario selecciona plan y cantidad
4. Opcionalmente aplica código
5. Redirección a Stripe o creación directa

### RF-2: Procesar Pago con Stripe

**Descripción**: Usuario completa pago mediante Stripe Checkout.

**Criterios de Aceptación**:
- Creación de sesión de checkout en Stripe
- Redirección a Stripe Checkout
- Procesamiento de pago
- Webhook de Stripe actualiza suscripción
- Confirmación de pago y activación de suscripción
- Incremento de "seats" disponibles

**Flujo**:
1. Usuario inicia checkout
2. API crea sesión de Stripe (`/api/stripe/create-checkout-session`)
3. Redirección a Stripe
4. Usuario completa pago
5. Webhook `checkout.session.completed` se procesa
6. Actualización de tabla `subscriptions`
7. Incremento de seats
8. Redirección a página de éxito

### RF-3: Usar Código de Acceso

**Descripción**: Usuario puede canjear código de acceso para obtener seats sin pago.

**Criterios de Aceptación**:
- Campo para ingresar código en página de suscripción
- Validación de código en tabla `access_codes`
- Verificación de uso previo (un código por usuario)
- Aplicación de código:
  - Creación de suscripción gratuita
  - Incremento de seats
  - Registro de uso en `access_code_usages`

**Flujo**:
1. Usuario ingresa código
2. Validación de código
3. Verificación de uso previo
4. Aplicación de código
5. Creación de suscripción
6. Incremento de seats

### RF-4: Renovar Suscripción

**Descripción**: Usuario puede renovar su suscripción antes de que expire.

**Criterios de Aceptación**:
- Acceso a `/account` o `/billing/renew`
- Visualización de suscripción actual y fecha de expiración
- Opción de renovar con mismo plan o diferente
- Proceso de pago similar a RF-2
- Extensión de `current_period_end`

**Flujo**:
1. Usuario accede a renovación
2. Visualiza suscripción actual
3. Selecciona plan de renovación
4. Proceso de pago
5. Extensión de periodo

### RF-5: Gestionar Suscripción (Portal de Stripe)

**Descripción**: Usuario puede gestionar su suscripción mediante Stripe Customer Portal.

**Criterios de Aceptación**:
- Acceso a portal desde `/account`
- Creación de sesión de portal (`/api/stripe/create-portal-session`)
- Redirección a Stripe Customer Portal
- Usuario puede:
  - Ver historial de pagos
  - Descargar facturas
  - Actualizar método de pago
  - Cancelar suscripción (si aplica)

### RF-6: Verificar Estado de Suscripción

**Descripción**: Sistema verifica estado de suscripción antes de permitir acciones premium.

**Criterios de Aceptación**:
- Verificación en múltiples puntos:
  - Crear partidos
  - Crear competiciones
  - Acceso a funciones premium
- Lógica:
  - Existe suscripción si hay >= 1 fila en `subscriptions`
  - Está activa si `current_period_end > ahora`
  - Independiente del campo `status` booleano
- Mensajes informativos cuando suscripción no está activa

## Gestión administrativa de suscripciones

### Requirement: Gestión administrativa de estado y vigencia

En contexto Admin, el sistema MUST permitir modificar estado y fecha de fin de una suscripción existente sin alterar el flujo de autoservicio del usuario final.

#### Scenario: Admin actualiza estado de suscripción
- **WHEN** un administrador autorizado actualiza el estado de una suscripción desde la vista dedicada de edición
- **THEN** el sistema MUST persistir el nuevo estado en la entidad administrativa correspondiente
- **AND** el nuevo estado MUST ser utilizado por el listado admin

#### Scenario: Admin actualiza `current_period_end`
- **WHEN** un administrador autorizado modifica la fecha de fin de una suscripción
- **THEN** el sistema MUST validar y persistir la nueva vigencia
- **AND** la modificación MUST quedar trazable mediante `updated_at`

### Requirement: Consulta de histórico de pagos en operación administrativa

La gestión administrativa de suscripciones MUST incluir acceso al histórico de pagos vinculado a la suscripción o, cuando no exista vinculación directa, al conjunto de pagos atribuible según criterio documentado.

#### Scenario: Histórico disponible para auditoría administrativa
- **WHEN** un administrador abre la edición de una suscripción
- **THEN** el sistema MUST mostrar histórico de pagos con datos mínimos de auditoría (fecha, importe, estado, referencia)
- **AND** la ausencia de pagos MUST mostrarse de forma explícita

### Requirement: Validación de campos editables en API admin

Los endpoints administrativos de suscripciones MUST validar whitelist de campos y catálogo de valores permitidos para proteger integridad de datos.

#### Scenario: Campo editable permitido
- **WHEN** el admin envía actualización de un campo permitido (estado, fecha fin, plan o capacidad según contrato vigente)
- **THEN** el backend MUST aplicar el cambio y devolver respuesta de éxito

#### Scenario: Campo o valor no permitido
- **WHEN** el admin envía un campo no permitido o valor inválido
- **THEN** el backend MUST devolver error de validación y no persistir cambios inconsistentes

## Requisitos No Funcionales

- **Seguridad**: Validación de webhooks de Stripe con firma
- **Idempotencia**: Prevención de duplicados en procesamiento de pagos
- **RLS**: Protección de datos de suscripciones
- **Sincronización**: Sincronización con Stripe mediante webhooks

## Modelo de Datos

### Tabla `subscriptions` (Schema Real Verificado)

**Columnas:**
- `id` (UUID, PK): Identificador único de la suscripción
- `user_id` (UUID, FK, NOT NULL): Referencia al usuario propietario (FOREIGN KEY -> auth.users.id)
- `stripe_customer_id` (text, nullable): ID del cliente en Stripe
- `stripe_subscription_id` (text, nullable): ID de la suscripción en Stripe
- `current_period_end` (timestamp with time zone, nullable): Fecha y hora de fin del periodo de facturación
- `cancel_at_period_end` (boolean, DEFAULT false): Indica si será cancelada al final del periodo
- `created_at` (timestamp with time zone, DEFAULT now()): Fecha y hora de creación
- `updated_at` (timestamp with time zone, DEFAULT now()): Fecha y hora de última actualización
- `access_code_id` (UUID, FK, nullable): Referencia al código de acceso usado (FOREIGN KEY -> access_codes.id)
- `amount` (bigint, DEFAULT 0): Importe en **céntimos** (ej: 1000 = 10.00 EUR)
- `currency` (text, DEFAULT 'EUR'): Divisa (EUR, USD, etc.)
- `seats` (integer, DEFAULT 1): Número de seats/jugadores incluidos
- `notified_expiry_7d_at` (timestamp with time zone, nullable): Fecha en que se envió notificación de expiración a 7 días
- `plan_id` (UUID, FK, nullable): Referencia al plan de suscripción (FOREIGN KEY -> subscription_plans.id)
- `status` (text, CHECK constraint): Estado según Stripe

**Notas importantes:**
- **El campo `status` es de tipo `text`** (NO `boolean`). Valores válidos según Stripe: `'active'`, `'trialing'`, `'past_due'`, `'canceled'`, `'unpaid'`, `'incomplete'`, `'incomplete_expired'`, `'paused'`
- **El campo `amount` es `bigint`** y representa el importe en **céntimos**
- **Existe `access_code_id`** que puede ser NULL si la suscripción proviene de Stripe
- **CHECK constraint**: `status` debe cumplir `subscriptions_status_check` que valida valores según Stripe

### Tabla `subscription_plans`
- `id` (UUID, PK)
- `name` (text)
- `days` (integer): Duración en días
- `price_cents` (integer): Precio en centavos
- `currency` (text)
- `stripe_price_id` (text, nullable): ID de precio en Stripe
- `active` (boolean)
- `created_at` (timestamp)

### Tabla `access_codes` (Schema Real Verificado)

**Columnas:**
- `id` (UUID, PK): Identificador único del código
- `code` (text, unique, NOT NULL): Código canjeable (texto que introduce el usuario)
- `usage_count` (integer, DEFAULT 0): Contador de cuántas veces se ha usado el código
- `max_uses` (integer, nullable): Máximo de usos permitidos (null = ilimitado)
- `prescriber` (text, nullable): Persona o entidad que emitió/prescribió el código
- `num_days` (integer, NOT NULL): Número de días de acceso que otorga el código
- `active` (boolean, DEFAULT true, NOT NULL): Si el código está activo y disponible para uso
- `created_at` (timestamp with time zone, DEFAULT now()): Fecha y hora de creación del código

**Notas importantes:**
- El campo del código se llama `code` (no `code_text`)
- El contador se llama `usage_count` (no `used_count`)
- Los días se llaman `num_days` (no `days`)
- No hay campo `seats` en access_codes (los códigos siempre otorgan 1 seat por defecto)
- No hay campo `expires_at` en access_codes (la expiración se maneja por otros medios o no existe)
- **Campo de estado unificado**: Solo existe `active`. El campo `is_active` fue eliminado por ser redundante (ver migración aplicada)

**Migración aplicada:**
- Fecha: Ver `migrate_remove_is_active_from_access_codes.sql`
- Acción: Eliminación de columna `is_active` duplicada, unificación en `active`
- Razón: Campos redundantes sin diferencia funcional, simplificación del schema

### Tabla `access_code_usages` (Schema Real Verificado)

**Columnas:**
- `id` (UUID, PK): Identificador único del registro de uso
- `code_id` (UUID, FK): Referencia al código usado (FOREIGN KEY -> access_codes.id)
- `user_id` (UUID, FK): Referencia al usuario que usó el código (FOREIGN KEY -> auth.users.id)
- `player_id` (UUID, FK, nullable): Referencia al jugador asociado (FOREIGN KEY -> players.id, puede ser NULL)
- `created_at` (timestamp with time zone, DEFAULT now()): Fecha y hora en que se registró el uso

**Notas importantes:**
- La columna de timestamp se llama `created_at` (NO `used_at`)
- El campo `player_id` permite asociar el uso del código a un jugador específico
- Se usa para prevenir uso duplicado del código por el mismo usuario

### Tabla `subscription_players` (Schema Real Verificado)

**Columnas:**
- `id` (UUID, PK): Identificador único del registro de vinculación
- `subscription_id` (UUID, FK, NOT NULL): Referencia a la suscripción (FOREIGN KEY -> subscriptions.id)
- `player_id` (UUID, FK, NOT NULL): Referencia al jugador vinculado (FOREIGN KEY -> players.id)
- `linked_at` (timestamp with time zone, DEFAULT now()): Fecha y hora en que se vinculó el jugador
- `unlinked_at` (timestamp with time zone, nullable): Fecha y hora en que se desvinculó el jugador (si aplica)
- `amount_cents` (bigint, DEFAULT 0): Importe en **céntimos** asociado a este vínculo
- `currency` (text, DEFAULT 'EUR'): Divisa del importe (EUR, USD, etc.)
- `created_at` (timestamp with time zone, DEFAULT now()): Fecha y hora de creación del registro
- `source` (text, NOT NULL): Origen del vínculo: `'code'` (código de acceso) o `'stripe'` (pago Stripe)
- `access_code_id` (UUID, FK, nullable): Referencia al código usado (FOREIGN KEY -> access_codes.id, si aplica)

**Notas importantes:**
- **El campo `amount_cents` es `bigint`** y representa el importe en **céntimos**
- **Existe el campo `unlinked_at`** que permite rastrear cuándo se desvinculó un jugador (soft delete del vínculo)
- **El campo `source`** indica el origen: `'code'` para códigos de acceso o `'stripe'` para pagos
- Esta tabla vincula jugadores a suscripciones específicas y mantiene historial de asociaciones

### Tabla `payments`
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `provider` (text): 'stripe'
- `stripe_payment_intent_id` (text, nullable)
- `stripe_invoice_id` (text, nullable)
- `receipt_url` (text, nullable)
- `amount_cents` (integer)
- `currency` (text)
- `description` (text)
- `status` (text): 'succeeded', 'failed', 'pending'
- `paid_at` (timestamp, nullable)
- `created_at` (timestamp)

## Integraciones

- **Stripe Checkout**: Procesamiento de pagos
- **Stripe Customer Portal**: Gestión de suscripciones
- **Stripe Webhooks**: Sincronización de eventos
- **RPC `seats_remaining`**: Cálculo de seats disponibles

## Estados y Flujos

### Estados de Suscripción
- **Activa**: `status = 'active'` y `current_period_end > ahora` (o `current_period_end IS NULL`)
- **En periodo de prueba**: `status = 'trialing'`
- **Vencida**: `status = 'past_due'` o `current_period_end <= ahora` con `status = 'active'`
- **Cancelada**: `status = 'canceled'` o `cancel_at_period_end = true`
- **Incompleta**: `status IN ('incomplete', 'incomplete_expired')`
- **Pausada**: `status = 'paused'`
- **No pagada**: `status = 'unpaid'`

**Nota**: El campo `status` es de tipo `text` con valores según Stripe (ver schema real verificado)

### Flujo de Pago
```
Seleccionar plan → Crear sesión Stripe → Checkout → Pago exitoso
                                                      ↓
                                              Webhook procesado
                                                      ↓
                                              Actualizar subscriptions
                                                      ↓
                                              Incrementar seats
```

### Flujo de Código
```
Ingresar código → Validar → Verificar uso → Aplicar código
                                              ↓
                                        Crear suscripción
                                              ↓
                                        Incrementar seats
```

## Casos de Uso

1. **Usuario nuevo ve planes**: RF-1
2. **Usuario compra suscripción**: RF-2
3. **Usuario canjea código**: RF-3
4. **Usuario renueva suscripción**: RF-4
5. **Usuario gestiona suscripción**: RF-5
6. **Sistema verifica suscripción antes de crear partido**: RF-6
7. **Webhook procesa pago exitoso**: RF-2
8. **Webhook procesa pago fallido**: Manejo de errores

## Límites y Restricciones

- Un código de acceso solo puede usarse una vez por usuario
- Seats se calculan sumando todas las suscripciones activas
- Suscripciones se extienden (no se reemplazan) al renovar
- Webhooks deben validarse con firma de Stripe
