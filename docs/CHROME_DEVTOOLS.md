# Cómo empezar a usar Chrome DevTools

## Abrir las herramientas

- **Atajo:** `F12` o `Ctrl+Shift+I` en Windows/Linux, `Cmd+Option+I` en macOS.
- **Menú:** Chrome → **Más herramientas** → **Herramientas para desarrolladores**.
- **Sobre un elemento:** clic derecho en la página → **Inspeccionar**.

Chrome abre un panel acoplado abajo o a un lado. Puedes cambiar su posición desde el menú `⋮` del panel o arrastrándolo.

## Pestañas principales

| Pestaña | Para qué sirve |
| --- | --- |
| **Elements** | Ver y editar HTML/CSS en vivo, revisar estilos computados y modelo de caja. |
| **Console** | Ver errores, revisar `console.log` y ejecutar JavaScript corto. |
| **Sources** | Depurar JavaScript con breakpoints y ejecución paso a paso. |
| **Network** | Inspeccionar peticiones HTTP, tiempos, tamaños y recursos fallidos. |
| **Application** | Revisar Service Workers, Local Storage, cookies e IndexedDB. |
| **Performance** | Grabar carga o interacciones y analizar CPU, renderizado y pintura. |
| **Lighthouse** | Ejecutar auditorías de rendimiento, accesibilidad, SEO y PWA. |

## Flujo mínimo recomendado

1. Abre la web en Chrome y pulsa `F12`.
2. En **Elements**, selecciona un nodo y prueba a activar/desactivar clases o editar CSS para validar cambios visuales.
3. En **Console**, recarga la página y revisa errores en rojo.
4. En **Network**, marca **Disable cache**, recarga y ordena por **Waterfall** o **Time** para encontrar recursos lentos o fallidos.

Los cambios hechos en DevTools no se guardan en el código. Úsalos para experimentar y luego traslada la solución al repositorio.

## Lighthouse

1. Con DevTools abierto, entra en **Lighthouse**. Si no aparece, búscalo en el menú `>>`.
2. Elige categorías, por ejemplo **Performance**, y dispositivo **Mobile** o **Desktop**.
3. Pulsa **Analyze page load**.
4. Revisa métricas como LCP, CLS y oportunidades de mejora.

Lighthouse ofrece datos de laboratorio. Para datos reales de usuarios, combínalo con [PageSpeed Insights](https://pagespeed.web.dev/).

## Consejos útiles

- **Device toolbar:** `Ctrl+Shift+M` en Windows/Linux, `Cmd+Shift+M` en macOS, para simular móvil y tamaños de pantalla.
- **Settings:** el engranaje de DevTools permite ajustar idioma, tema y comportamiento del panel.
- **Documentación oficial:** [Chrome DevTools](https://developer.chrome.com/docs/devtools/).

## Chrome DevTools MCP en Cursor

Si quieres usar Chrome DevTools desde Cursor mediante MCP, asegúrate de que el conector `chrome-devtools` aparece activo en **Cursor Settings → Tools & MCP**. En Windows, el comando del MCP debe apuntar a `npx.cmd` si `npx` no arranca correctamente desde Cursor.
