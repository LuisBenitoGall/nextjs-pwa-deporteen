# Instrucciones para Agentes de IA

Este documento proporciona instrucciones específicas para herramientas de IA que trabajan con el código de DeporTeen.

## Contexto del Proyecto

DeporTeen es una PWA de gestión deportiva construida con Next.js 15, React 19, Supabase y Stripe. El proyecto sigue una arquitectura moderna con App Router de Next.js.

## Convenciones de Código

### Estructura de Archivos

- **Componentes**: `src/components/` - Componentes reutilizables
- **Páginas**: `src/app/` - Rutas y páginas (App Router)
- **API Routes**: `src/app/api/` - Endpoints de API
- **Librerías**: `src/lib/` - Utilidades y helpers
- **Configuración**: `src/config/` - Constantes y configuraciones
- **i18n**: `src/i18n/` - Internacionalización

### Nomenclatura

- **Componentes React**: PascalCase (ej: `NewPlayerForm.tsx`)
- **Utilidades**: camelCase (ej: `uploadMatchMedia.ts`)
- **Constantes**: UPPER_SNAKE_CASE (ej: `LIMITS`)
- **Tipos TypeScript**: PascalCase (ej: `type Player = {...}`)

### Patrones Importantes

1. **Autenticación**: Usar `createSupabaseServerClient()` en servidor, `supabaseBrowser()` en cliente
2. **Internacionalización**: Usar `tServer()` en servidor, `useT()` hook en cliente
3. **Validación**: Usar Zod para schemas, React Hook Form para formularios
4. **RLS**: Todas las queries deben respetar Row Level Security de Supabase
5. **PWA**: Service Worker registrado automáticamente, soporte offline

### Reglas de Seguridad

- **Nunca** exponer `SUPABASE_SERVICE_ROLE_KEY` en el cliente
- **Siempre** verificar autenticación en rutas protegidas
- **Siempre** verificar ownership de recursos (jugadores, partidos, etc.)
- **Usar** RLS policies en Supabase para seguridad adicional
- **Validar** inputs del usuario con Zod antes de procesar

### Gestión de Estado

- Preferir Server Components cuando sea posible
- Usar React hooks (`useState`, `useEffect`) solo cuando sea necesario
- Para datos del servidor, usar Server Components y async/await
- Para datos reactivos, usar Supabase Realtime si es necesario

### Manejo de Errores

- Mostrar mensajes de error amigables al usuario
- Registrar errores en consola para debugging
- Usar try/catch en operaciones asíncronas
- Validar datos antes de enviar a la base de datos

### Internacionalización

- Todos los textos visibles deben usar el sistema de traducción
- Claves de traducción en `src/i18n/messages/{locale}.json`
- Usar `t('clave')` para obtener traducciones
- Proporcionar valores por defecto cuando sea apropiado

### Multimedia

- Almacenamiento local en IndexedDB por defecto
- Opcionalmente subir a Supabase Storage si `NEXT_PUBLIC_CLOUD_MEDIA=1`
- Usar `uploadMatchMedia()` para subir medios
- Resolver URLs con `device_uri` (local) o `storage_path` (cloud)

### Suscripciones

- Verificar estado de suscripción antes de permitir acciones premium
- Usar `seats_remaining` RPC para verificar asientos disponibles
- Integrar con Stripe para pagos
- Manejar webhooks de Stripe para actualizar suscripciones

### Testing

- Usar Vitest para tests unitarios
- Usar Testing Library para tests de componentes
- Mantener tests actualizados con cambios de código

## Flujos Comunes

### Crear un Jugador

1. Verificar asientos disponibles (`seats_remaining`)
2. Validar datos del formulario
3. Llamar a `create_player_link_subscription` RPC
4. Crear `player_seasons` para la temporada actual
5. Crear competiciones asociadas
6. Subir avatar si se proporciona

### Crear un Partido

1. Verificar suscripción activa
2. Validar datos del formulario
3. Insertar en tabla `matches`
4. Opcionalmente subir medios asociados

### Procesar Pago

1. Crear sesión de checkout en Stripe
2. Redirigir usuario a Stripe
3. Procesar webhook cuando se complete el pago
4. Actualizar tabla `subscriptions`
5. Incrementar `seats` disponibles

## Recursos Importantes

- **Documentación Next.js**: https://nextjs.org/docs
- **Documentación Supabase**: https://supabase.com/docs
- **Documentación Stripe**: https://stripe.com/docs
- **OpenSpec**: Ver `openspec/specs/` para especificaciones detalladas

## Notas Adicionales

- El proyecto usa pnpm como gestor de paquetes
- TypeScript está configurado estrictamente
- ESLint está configurado con reglas de Next.js
- El proyecto soporta PWA con Service Worker
- Hay soporte para múltiples idiomas (es, ca, en)
