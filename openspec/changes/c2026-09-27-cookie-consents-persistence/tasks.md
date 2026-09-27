## 1. OpenSpec

- [x] 1.1 Delta `specs/legal/cookie-consent/spec.md`
- [x] 1.2 Copiar spec consolidada a `openspec/specs/legal/cookie-consent/spec.md`

## 2. Base de datos

- [x] 2.1 Migración `supabase/migrations/20260927170000_cookie_consents.sql`
- [x] 2.2 Aplicar en base de referencia y verificar RLS

## 3. Aplicación

- [x] 3.1 Tipos en `database.types.ts` para `cookie_consents`
- [x] 3.2 Validación payload + endpoint tipado
- [x] 3.3 Tests Vitest del endpoint y validación

## 4. Calidad

- [x] 4.1 `pnpm lint`, `pnpm types`, `pnpm test:run`, `pnpm build`
