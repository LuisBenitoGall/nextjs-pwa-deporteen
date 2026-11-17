## 1. Auditoría

- [x] 1.1 Comparar los siete locales contra `es`: ausentes, sobrantes, idénticos a la base, marcadores y vacíos
- [x] 1.2 Clasificar «idéntico a `es`» en gap real vs cognado/nombre propio
- [x] 1.3 Publicar el inventario con recuento por idioma y por área antes de tocar los ficheros

## 2. Traducciones

- [x] 2.1 Las 18 claves ausentes en `ca`, `it`, `pt`, `eu`, `gl`
- [x] 2.2 `legal.cookies.sections[4]` en `en`
- [x] 2.3 Bloque común de 18 claves copiadas en castellano a los seis locales
- [x] 2.4 Textos legales de `ca` (47 hojas)
- [x] 2.5 Panel Stripe y bloque `suscripcion_*` de `ca`
- [x] 2.6 Bloque `storage_*` de `pt`, en pt-BR para no mezclar variantes
- [x] 2.7 Errata `avatar_max_size` en la referencia y propagación

## 3. Motor

- [x] 3.1 `interpolate()` admite marcadores en minúscula sin tocar los `{{...}}` legales

## 4. Prevención

- [x] 4.1 `src/i18n/__tests__/locale-parity.test.ts` (ausentes, sobrantes, vacíos, marcadores)
- [x] 4.2 Comprobar que el test falla ante una regresión provocada
- [x] 4.3 Retirar `scripts/verify-i18n-parity.mjs`, sustituido por el test

## 5. Calidad

- [x] 5.1 `pnpm lint`, `pnpm types`, `pnpm test:run`, `pnpm build`
- [x] 5.2 Re-auditoría: los seis locales con 814 hojas, 0 ausentes, 0 sobrantes
