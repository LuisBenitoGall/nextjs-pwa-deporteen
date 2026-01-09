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

## Requisitos No Funcionales

- **Seguridad**: Validación de webhooks de Stripe con firma
- **Idempotencia**: Prevención de duplicados en procesamiento de pagos
- **RLS**: Protección de datos de suscripciones
- **Sincronización**: Sincronización con Stripe mediante webhooks

## Modelo de Datos

### Tabla `subscriptions`
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `plan_id` (UUID, FK)
- `seats` (integer): Número de seats incluidos
- `status` (boolean): Estado booleano (legacy)
- `current_period_end` (timestamp): Fecha de expiración
- `cancel_at_period_end` (boolean)
- `stripe_customer_id` (text, nullable)
- `stripe_subscription_id` (text, nullable)
- `amount` (integer): Monto en centavos
- `currency` (text): Divisa (EUR, USD, etc.)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Tabla `subscription_plans`
- `id` (UUID, PK)
- `name` (text)
- `days` (integer): Duración en días
- `price_cents` (integer): Precio en centavos
- `currency` (text)
- `stripe_price_id` (text, nullable): ID de precio en Stripe
- `active` (boolean)
- `created_at` (timestamp)

### Tabla `access_codes`
- `id` (UUID, PK)
- `code_text` (text, unique): Código canjeable
- `seats` (integer): Seats que otorga
- `days` (integer): Duración en días
- `max_uses` (integer, nullable): Máximo de usos (null = ilimitado)
- `used_count` (integer): Contador de usos
- `expires_at` (timestamp, nullable)
- `active` (boolean)
- `created_at` (timestamp)

### Tabla `access_code_usages`
- `id` (UUID, PK)
- `code_id` (UUID, FK)
- `user_id` (UUID, FK)
- `used_at` (timestamp)

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
- **Activa**: `current_period_end > ahora`
- **Expirada**: `current_period_end <= ahora`
- **Cancelada**: `cancel_at_period_end = true`

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
