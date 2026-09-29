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

## Objetivos

1. Las `key` de React nunca se derivan de texto traducido (identificadores estables: slug de deporte, id de característica).
2. Ninguna vista renderiza texto vacío mientras carga el diccionario: el locale por defecto viaja en el bundle inicial, así que SSR y primer render de cliente ya tienen todos los textos.
3. Cerrar la fuga del mismo patrón en los selectores de deporte que sí leen `public.sports` sin filtrar por `active`.

## Cambios

- `src/i18n/I18nProvider.tsx`: `dict` se inicializa con `messages/es.json` (`DEFAULT_LOCALE`) importado de forma estática; `t()` cae al diccionario por defecto cuando el locale activo no tiene la clave; un fallo de carga ya no vacía el diccionario.
- `src/components/HeroSection.tsx`: los deportes se derivan de `SPORTS` (`key={sport.slug}`), las características de `FEATURE_IDS` (`key={id}`), y `FeatureCard` sale del cuerpo del componente para no redefinirse en cada render.
- `src/lib/sports/index.ts`: `SPORTS` gana `i18nKey` (única fuente de verdad del catálogo de la home) y se añade `isSportActive()`.
- Selectores de deporte: `NewMatchEmbedded` y `CompetitionEditForm` leían `public.sports` **sin filtrar `active`**, contra lo que ya exigía RF-1 de `specs/sports`. Ahora filtran con `isSportActive()` conservando el deporte ya asignado para no vaciar la selección al editar. `NewPlayerForm` y `CompetitionNewForm` pasan al mismo helper.

## Coste y contrapartidas

`es.json` (~52 kB en crudo) entra en el grafo inicial: la home pasa de 179 kB a 193 kB de *First Load JS* (+14 kB). Se acepta a cambio de que el HTML de la home contenga todos los textos (antes se servía sin una sola cadena visible, con el consiguiente perjuicio de SEO e indexación) y de eliminar el parpadeo de contenido vacío. Para locales distintos de `es` el primer pintado muestra castellano y se sustituye al resolver el locale; nunca queda en blanco.

## Fuera de alcance

- Renderizar la home desde componentes servidor con `tServer()` (eliminaría el swap de locale en cliente, pero es un rediseño de la home).
- Cargar solo el subconjunto de claves de cada ruta.
- Desactivar o borrar filas legacy de `public.sports`: ya se hizo en la reconciliación de slugs y no afecta a la home.

## Verificación

- `pnpm lint` (0 errores), `pnpm types`, `pnpm test:run`, `pnpm build`.
- `HeroSection.stable-keys.test.tsx` falla con las `key` antiguas (11 `<h3>`) y pasa con las nuevas.
- HTML del build local: `Baloncesto` y los seis títulos de características aparecen, cada icono de deporte una sola vez.
