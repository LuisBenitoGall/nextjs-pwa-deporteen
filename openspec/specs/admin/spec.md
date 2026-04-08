# Panel de Administración

## Descripción

Panel de administración para gestionar productos, precios, cupones, enlaces de pago e invoices en Stripe. Acceso restringido a usuarios con rol de administrador.

## Requisitos Funcionales

### RF-1: Control de Acceso

**Descripción**: Solo usuarios administradores pueden acceder al panel.

**Criterios de Aceptación**:
- Verificación de rol admin mediante `isAdminUser()`
- Lista de emails admin en `NEXT_PUBLIC_ADMIN_EMAILS`
- Rutas protegidas bajo `/admin/*`
- Redirección a mensaje de acceso denegado si no es admin
- Layout común para todas las rutas admin

**Flujo**:
1. Usuario accede a ruta `/admin/*`
2. Verificación de autenticación
3. Verificación de rol admin
4. Acceso permitido o denegado

### RF-2: Gestión de Productos de Stripe

**Descripción**: Administrador puede crear, listar y gestionar productos en Stripe.

**Criterios de Aceptación**:
- Acceso a `/admin/stripe/products`
- Lista de productos existentes
- Crear nuevo producto:
  - Nombre
  - Descripción
  - Imagen (opcional)
- Sincronización con Stripe
- Visualización de productos con sus precios asociados

**Flujo**:
1. Admin accede a productos
2. Visualiza lista
3. Crea/edita producto
4. Sincronización con Stripe
5. Actualización de lista

### RF-3: Gestión de Precios de Stripe

**Descripción**: Administrador puede crear y gestionar precios en Stripe.

**Criterios de Aceptación**:
- Acceso a `/admin/stripe/prices`
- Lista de precios existentes
- Crear nuevo precio:
  - Producto asociado
  - Monto
  - Divisa
  - Tipo (one-time o recurring)
  - Intervalo (si es recurring)
- Editar precio existente
- Vincular precio a `subscription_plans` en BD

**Flujo**:
1. Admin accede a precios
2. Visualiza lista
3. Crea/edita precio
4. Sincronización con Stripe
5. Vinculación con plan en BD

### RF-4: Gestión de Cupones

**Descripción**: Administrador puede crear, editar y gestionar cupones de descuento.

**Criterios de Aceptación**:
- Acceso a `/admin/stripe/coupons`
- Lista de cupones existentes
- Crear cupón:
  - ID/código
  - Tipo (porcentaje o cantidad fija)
  - Valor de descuento
  - Duración
  - Fecha de expiración (opcional)
  - Límite de usos (opcional)
- Editar cupón existente
- Eliminar/desactivar cupón

**Flujo**:
1. Admin accede a cupones
2. Visualiza lista
3. Crea/edita cupón
4. Sincronización con Stripe
5. Actualización de lista

### RF-5: Gestión de Enlaces de Pago

**Descripción**: Administrador puede crear y gestionar Payment Links de Stripe.

**Criterios de Aceptación**:
- Acceso a `/admin/stripe/payment-links`
- Lista de enlaces existentes
- Crear enlace de pago:
  - Producto/precio asociado
  - URL de éxito
  - URL de cancelación
- Copiar URL de enlace
- Ver estadísticas de uso

**Flujo**:
1. Admin accede a enlaces
2. Visualiza lista
3. Crea enlace
4. Obtiene URL
5. Comparte URL

### RF-6: Visualización de Invoices

**Descripción**: Administrador puede ver facturas/invoices de Stripe.

**Criterios de Aceptación**:
- Acceso a `/admin/stripe/invoices`
- Lista de invoices con:
  - ID
  - Cliente
  - Monto
  - Estado
  - Fecha
  - Enlace a invoice en Stripe
- Filtros por estado, fecha, cliente
- Búsqueda

**Flujo**:
1. Admin accede a invoices
2. Visualiza lista
3. Aplica filtros
4. Accede a detalles en Stripe

### RF-7: Gestión de Suscripciones

**Descripción**: Administrador puede ver y gestionar suscripciones de usuarios.

**Criterios de Aceptación**:
- Acceso a `/admin/stripe/subscriptions`
- Lista de suscripciones con:
  - Usuario
  - Plan
  - Estado
  - Fecha de inicio
  - Fecha de expiración
  - Seats
- Filtros y búsqueda
- Acceso a detalles en Stripe

## Requisitos No Funcionales

- **Seguridad**: Acceso estricto solo para admins
- **Sincronización**: Sincronización bidireccional con Stripe
- **Auditoría**: Registro de acciones administrativas
- **Performance**: Carga eficiente de listas grandes

## Modelo de Datos

Las tablas principales ya están definidas en otras specs. El panel admin principalmente gestiona datos en Stripe y los sincroniza con la BD local.

### Tablas relacionadas:
- `subscription_plans`: Vinculada con precios de Stripe
- `subscriptions`: Sincronizada con suscripciones de Stripe
- `payments`: Registro de pagos

## Integraciones

- **Stripe API**: Todas las operaciones CRUD en Stripe
- **Stripe Dashboard**: Enlaces a dashboard para detalles
- **Supabase**: Sincronización con BD local

## Estados y Flujos

### Flujo de Creación de Producto
```
Admin crea producto → API crea en Stripe → Sincronización → Actualización UI
```

### Flujo de Creación de Precio
```
Admin crea precio → API crea en Stripe → Vinculación con plan → Actualización UI
```

### Flujo de Gestión de Cupón
```
Admin crea/edita cupón → API actualiza Stripe → Sincronización → Actualización UI
```

## Casos de Uso

1. **Admin accede al panel**: RF-1
2. **Admin crea producto**: RF-2
3. **Admin crea precio**: RF-3
4. **Admin crea cupón**: RF-4
5. **Admin crea enlace de pago**: RF-5
6. **Admin visualiza invoices**: RF-6
7. **Admin gestiona suscripciones**: RF-7
8. **Usuario no admin intenta acceder**: RF-1 (acceso denegado)

## Límites y Restricciones

- Solo usuarios con email en `NEXT_PUBLIC_ADMIN_EMAILS` pueden acceder
- Operaciones en Stripe requieren `STRIPE_SECRET_KEY`
- Sincronización puede tener latencia
- Algunas operaciones en Stripe son irreversibles
