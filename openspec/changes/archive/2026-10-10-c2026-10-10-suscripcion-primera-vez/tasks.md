## 1. Banner

- [x] 1.1 En `src/app/(public)/layout.tsx`, mostrar el banner de suscripción vencida solo si `hasAnySubscription` es verdadero y `isActiveSubscription` es falso
- [x] 1.2 Dejar el texto y el enlace del banner como están («Renovar ahora» hacia `/billing/renew`) cuando sí se muestra

## 2. Mi Cuenta

- [x] 2.1 Añadir la clave del botón «Crear suscripción» en `src/i18n/messages/es/core.json`, `en/core.json` y `ca/core.json`, sin reutilizar `suscribirme`
- [x] 2.2 En el bloque de suscripciones de `src/app/(public)/account/page.tsx`, mostrar ese botón solo cuando no hay ninguna fila, enlazado a `/subscription`
- [x] 2.3 No mostrar el botón si ya hay al menos una fila, esté activa o vencida

## 3. Verificación

- [ ] 3.1 Comprobar tres casos del banner: sin filas (oculto), con fila no activa (visible y a renovar), con suscripción activa (oculto)
- [ ] 3.2 Comprobar Mi Cuenta: sin filas sale Crear suscripción hacia `/subscription`; con alguna fila el botón no sale
- [ ] 3.3 Confirmar que el aviso de caducidad próxima y el panel no cambian de reglas
