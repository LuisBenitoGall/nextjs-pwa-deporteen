# Propuesta: robustez UX y seguridad (sin modelo de negocio)

## Contexto

Segunda tanda tras merges #44–#47 (`master` @ `a10bc8b`). Fuente: `docs/pendientes-tras-arreglos.md` en el store del proyecto. **Fuera de alcance:** planes, precios, asientos, cobro de almacenamiento, Stripe checkout/admin suscripciones y migraciones en producción.

## Objetivos

1. **Seguridad de rutas**: ampliar rutas protegidas en middleware (`/matches`, `/gallery`); bloquear cuentas con `users.status = false` en rutas autenticadas (MED-06, MED-12).
2. **Logout SSR**: invalidar sesión Supabase además de borrar cookies; redirección al origen de la petición cuando aplique (ALTO-06 parcial).
3. **Feedback en borrados**: server actions de borrado con redirección y banner i18n ante éxito/error (ALTO-15).
4. **Errores de carga coherentes**: componente reutilizable con CTAs de salida en live, edit, listados y admin competiciones (ALTO-17, MED-15).
5. **Partido en vivo**: eliminar carrera entre debounce de notas/estadísticas y guardado inmediato del marcador (MED-13).
6. **PWA/navegación**: fallback de “volver” en galería sin `matchId` hacia `/gallery` (MED-25).
7. **Datos**: marcador inicial numérico al crear partido (BAJO-08).
8. **Errores globales**: `error.tsx` raíz para evitar pantallas genéricas de Next (ALTO-05, MED-20 parcial).
9. **Admin expulsado**: banner en home ante `?error=forbidden` (MED-07).

## Fuera de alcance / no verificable en VM

| ID | Motivo |
|----|--------|
| CRIT-03, CRIT-06, CRIT-11, CRIT-15 | Pagos, admin suscripciones, R2/cuota en runtime |
| ALTO-07, ALTO-10, MED-08 | Stripe/BD/asientos |
| MED-05 | Rate-limit signup — requiere decisión de umbral y despliegue |
| MED-10, MED-11, BAJO-02 | Regenerar tipos/baseline sin BD real |
| MED-14 | Paginación — alcance grande |
| MED-19 | Borrado de cuenta vs esquema `teams`/`competitions` — riesgo de modelo |
| MED-18 | Ya corregido en `master`; tests existentes |
| MED-21 | Manifest ya sin `screenshots` en `master` |
| BAJO-04–14 (mayoría) | i18n/PWA menor no prioritario en esta tanda |

## Riesgos

- Middleware más estricto puede redirigir a login usuarios que accedían anónimamente a `/matches` o `/gallery` (comportamiento deseado).
- Comprobar `users.status` añade una lectura Supabase por request en rutas protegidas.

## Verificación

- `pnpm lint`, `pnpm types`, `pnpm test:run`, `pnpm build`.
