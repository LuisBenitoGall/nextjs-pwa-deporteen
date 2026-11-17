# Propuesta: tarjetas duplicadas en la home (deportes y características)

## Contexto

En `https://www.deporteen.com` la home pintaba **cada lista de tarjetas dos veces**: primero un grupo con icono pero sin texto (8 deportes, 5 características) y después el grupo completo y correcto (9 deportes, 6 características).

### Causa raíz

`I18nProvider` arrancaba con `dict = {}` y cargaba el diccionario del locale con un `import()` dinámico dentro de un `useEffect`. Por tanto **el render de servidor y el primer render de cliente devolvían cadenas vacías** para todas las claves (`t('baloncesto') === ''`).

`HeroSection` derivaba las `key` de React de ese texto traducido:

```tsx
<div key={sport.name}>      {/* '' en el primer render */}
<FeatureCard key={f.title} />{/* '' en el primer render */}
```

Con el diccionario vacío las 9 tarjetas de deporte compartían `key=""` y las 6 características también. Cuando el diccionario llegaba y las claves pasaban a ser distintas, la reconciliación de React solo puede borrar **una** fibra por clave duplicada (`mapRemainingChildren` colapsa el mapa), así que las `n-1` restantes quedaban huérfanas: sus nodos del DOM nunca se eliminaban. De ahí los números exactos del informe, 8 deportes y 5 características fantasma, siempre delante del grupo correcto y siempre sin texto.

Evidencia:

- El HTML de producción contenía los iconos (`icon-baloncesto.png`) y **cero** apariciones de `Baloncesto` o de los títulos de características: el primer render era íntegramente sin texto.
- Test de regresión `HeroSection.stable-keys.test.tsx` con las `key` antiguas: 11 `<h3>` en lugar de 6.

### Hipótesis descartada: datos duplicados en BD

La home **no consulta `public.sports`**: la lista sale del catálogo estático `src/lib/sports/index.ts`. Los deportes legacy con guion bajo desactivados en la reconciliación de slugs no intervienen. No hace falta ninguna acción en base de datos para arreglar la home.

## Relación con #57 (`c2026-09-29-legaldoc-ssr-sanitize`)

Mientras se diagnosticaba esto, #57 (`LegalDoc` lee secciones legales desde messages i18n) sembró `I18nProvider` con `es.json` importado de forma estática, por el mismo motivo de SSR/primer paint. Eso **elimina el disparador** del fallo: con diccionario lleno en el primer render las `key` ya no colisionan, y producción vuelve a servir los textos.

Este change no lo revierte ni lo duplica: ataca la **causa raíz**, que es que una `key` de React dependa de un valor que puede cambiar o vaciarse entre renders. Sin esto el fallo vuelve en cuanto un locale no tenga una de esas claves (`t()` devolvía `''`) o cambie la estrategia de carga del diccionario.

## Objetivos

1. Las `key` de React nunca se derivan de texto traducido (identificadores estables: slug de deporte, id de característica).
2. Cerrar el resto de caminos a texto vacío: `t()` cae al locale por defecto cuando falta la clave, y un fallo de carga no vacía el diccionario.
3. Cerrar la fuga del mismo patrón en los selectores de deporte que sí leen `public.sports` sin filtrar por `active`.

## Cambios

- `src/i18n/I18nProvider.tsx`: `t()` cae al diccionario del locale por defecto cuando el locale activo no tiene la clave; un fallo de carga ya no vacía el diccionario. El sembrado estático de `es.json` ya venía de #57 y se conserva tal cual.
- `src/components/HeroSection.tsx`: los deportes se derivan de `SPORTS` (`key={sport.slug}`), las características de `FEATURE_IDS` (`key={id}`), y `FeatureCard` sale del cuerpo del componente para no redefinirse en cada render.
- `src/lib/sports/index.ts`: `SPORTS` gana `i18nKey` (única fuente de verdad del catálogo de la home) y se añade `isSportActive()`.
- Selectores de deporte: `NewMatchEmbedded` y `CompetitionEditForm` leían `public.sports` **sin filtrar `active`**, contra lo que ya exigía RF-1 de `specs/sports`. Ahora filtran con `isSportActive()` conservando el deporte ya asignado para no vaciar la selección al editar. `NewPlayerForm` y `CompetitionNewForm` pasan al mismo helper.

## Coste y contrapartidas

El peso de `es.json` (~52 kB en crudo) en el grafo inicial ya lo asumió #57: la home estaba en 179 kB de *First Load JS* y hoy está en 193 kB en `master`. Medido en este branch: **193 kB, igual que `master`**, así que este change no añade peso.

La contrapartida se acepta porque el HTML de la home pasa a contener todos los textos —antes se servía sin una sola cadena visible, con el consiguiente perjuicio de SEO e indexación— y desaparece el parpadeo de contenido vacío. Para locales distintos de `es` el primer pintado muestra castellano y se sustituye al resolver el locale; nunca queda en blanco.

## Fuera de alcance

- Renderizar la home desde componentes servidor con `tServer()` (eliminaría el swap de locale en cliente, pero es un rediseño de la home).
- Cargar solo el subconjunto de claves de cada ruta, o trocear el diccionario por área para que los otros seis locales no repitan el mismo coste al sembrarse. Ver seguimiento propuesto más abajo.
- Desactivar o borrar filas legacy de `public.sports`: ya se hizo en la reconciliación de slugs y no afecta a la home.

## Seguimiento propuesto

Hoy solo `es` está en el bundle inicial; los otros seis locales siguen llegando por `import()` diferido, así que **el coste no se multiplica por siete**. El riesgo real es de crecimiento: `es.json` ya ronda las 743 claves e incluye los textos legales completos (`legal.*`), que solo consumen las rutas `/legal/*`. Antes de que crezca más conviene separar el diccionario en un núcleo (navegación, home, formularios) que se siembra, y bloques por área (`legal`, `admin`) que se cargan bajo demanda, manteniendo la regla de que ninguna vista renderice sin texto.

## Verificación

- `pnpm lint` (0 errores), `pnpm types`, `pnpm test:run`, `pnpm build`.
- `HeroSection.stable-keys.test.tsx` falla con las `key` antiguas (11 `<h3>`) y pasa con las nuevas.
- HTML del build local: `Baloncesto` y los seis títulos de características aparecen, cada icono de deporte una sola vez.
