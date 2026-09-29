## 1. Diagnóstico

- [x] 1.1 Reproducir la duplicación en test (`n-1` tarjetas fantasma por clave de React duplicada)
- [x] 1.2 Descartar datos duplicados de BD: la home no consulta `public.sports`
- [x] 1.3 Confirmar en el HTML de producción que el primer render no tiene texto

## 2. OpenSpec

- [x] 2.1 Delta `specs/internationalization/spec.md` (diccionario por defecto + claves estables)
- [x] 2.2 Delta `specs/sports/spec.md` (listados filtran por `active`)
- [x] 2.3 Consolidar en `openspec/specs/internationalization/spec.md` y `openspec/specs/sports/spec.md`

## 3. Aplicación

- [x] 3.1 `I18nProvider`: `dict` inicial con el locale por defecto y fallback de `t()`
- [x] 3.2 `HeroSection`: `key` estables (slug / id) y `FeatureCard` fuera del render
- [x] 3.3 `src/lib/sports`: `i18nKey` en `SPORTS` y helper `isSportActive()`
- [x] 3.4 Filtrar `active` en `NewMatchEmbedded` y `CompetitionEditForm`; unificar helper en `NewPlayerForm` y `CompetitionNewForm`

## 4. Pruebas

- [x] 4.1 `HeroSection.test.tsx`: 9 deportes y 6 características únicas, sin tarjetas sin texto, también al cambiar de idioma
- [x] 4.2 `HeroSection.stable-keys.test.tsx`: regresión del diccionario que llega tras el primer render

## 5. Calidad

- [x] 5.1 `pnpm lint`, `pnpm types`, `pnpm test:run`, `pnpm build`
- [x] 5.2 Verificar HTML del build local (textos presentes, un icono por deporte)
