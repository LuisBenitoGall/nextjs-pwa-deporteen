# DeporTeen - Proyecto

## Descripción General

DeporTeen es una Progressive Web App (PWA) para la gestión deportiva de jugadores jóvenes. Permite a familias y clubs registrar deportistas, gestionar sus competiciones, partidos y estadísticas, con soporte para múltiples deportes y temporadas.

## Tecnologías Principales

- **Frontend**: Next.js 15.5.3 (App Router), React 19.1.0
- **Backend**: Next.js API Routes, Supabase (PostgreSQL + Auth + Storage)
- **Pagos**: Stripe
- **Estilos**: Tailwind CSS 4
- **Internacionalización**: next-intl (español, catalán, inglés)
- **PWA**: Service Worker, Web App Manifest
- **Gestión de Estado**: React Hooks, Supabase Realtime
- **Validación**: Zod, React Hook Form

## Arquitectura

- **Arquitectura**: Monorepo Next.js con App Router
- **Base de datos**: Supabase (PostgreSQL) con Row Level Security (RLS)
- **Autenticación**: Supabase Auth (email/password, OAuth Google)
- **Almacenamiento**: Supabase Storage + IndexedDB (almacenamiento local)
- **Despliegue**: Vercel

## Modelo de Datos Principal

- **users**: Usuarios de la aplicación
- **players**: Deportistas/jugadores asociados a usuarios
- **seasons**: Temporadas deportivas (año inicio - año fin)
- **player_seasons**: Relación jugador-temporada con avatar
- **competitions**: Competiciones en las que participa un jugador
- **matches**: Partidos de un jugador en una competición
- **match_media**: Fotos y videos asociados a partidos
- **subscriptions**: Suscripciones de usuarios (planes de pago)
- **subscription_plans**: Planes de suscripción disponibles
- **clubs**: Clubs deportivos
- **teams**: Equipos dentro de clubs
- **sports**: Deportes disponibles
- **sport_categories**: Categorías por deporte (género, edad)

## Funcionalidades Principales

1. **Gestión de Usuarios**: Registro, login, perfil, configuración
2. **Gestión de Jugadores**: Crear, editar, ver perfil, temporadas
3. **Gestión de Competiciones**: Crear, ver, eliminar por temporada
4. **Gestión de Partidos**: Crear, editar, seguimiento en vivo, estadísticas
5. **Multimedia**: Subida y gestión de fotos/videos de partidos
6. **Suscripciones**: Planes de pago, códigos de acceso, renovación
7. **Panel Admin**: Gestión de Stripe (productos, precios, cupones, invoices)
8. **PWA**: Instalación, funcionamiento offline, notificaciones
9. **Internacionalización**: Soporte multi-idioma
10. **Estadísticas**: Visualización de datos de partidos y rendimiento

## Deportes Soportados

- Baloncesto
- Fútbol
- Fútbol Sala
- Balonmano
- Rugby
- Voleibol
- Waterpolo
- Hockey Hierba
- Hockey Patines

## Límites del Sistema

- Máximo de competiciones por temporada por jugador: Configurable en `LIMITS.COMPETITION_NUM_MAX_BY_SEASON`
- Sistema de "seats" (asientos): Controla cuántos jugadores puede crear un usuario según su suscripción
- Almacenamiento multimedia: Local (IndexedDB) + opcional en la nube (Supabase Storage)

## Variables de Entorno Importantes

- `NEXT_PUBLIC_SUPABASE_URL`: URL de Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima de Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio (backend)
- `STRIPE_SECRET_KEY`: Clave secreta de Stripe
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Clave pública de Stripe
- `NEXT_PUBLIC_ADMIN_EMAILS`: Lista de emails con acceso admin
- `NEXT_PUBLIC_CLOUD_MEDIA`: Flag para habilitar almacenamiento en nube (0/1)
