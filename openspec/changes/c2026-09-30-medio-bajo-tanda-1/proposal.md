# Change: Medio/Bajo tanda 1 (limpieza, admin Stripe, PWA, i18n registro)

## Motivación

Cerrar hallazgos **Medio/Bajo** pendientes tras la pila #44–#46, priorizados por Luis (sin tocar env vars de despliegue).

## Alcance

| ID | Cambio |
|----|--------|
| MED-17, MED-28, BAJO-10 | Eliminar código muerto (`src/app/players/new/*`, `NewMatchEmbedded.tsx`) |
| MED-08 | Aviso en admin Stripe Subscriptions: producto usa Checkout `payment`; fuente operativa en `/admin/suscripciones` |
| BAJO-14 | Banners cookies e instalación PWA apilados sin solapamiento visual |
| BAJO-07 | Corregir mojibake y em dash en listado de partidos por competición |
| BAJO-05, BAJO-12 | Registro: validaciones i18n y aplicar locale elegido tras alta exitosa |
| BAJO-01 (doc) | Comentario en `isSubscriptionActive` enlazado al criterio de spec |

## Fuera de alcance

MED-10/11, MED-14, MED-23, configuración env (CRIT-12 despliegue).
