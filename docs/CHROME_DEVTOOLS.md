# Cómo empezar a usar Chrome DevTools

## Abrir las herramientas

- **Atajo:** `F12` o `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac).
- **Menú:** Chrome → **Más herramientas** → **Herramientas para desarrolladores**.
- **Sobre un elemento:** clic derecho en la página → **Inspeccionar**.

Se abre un panel acoplado (abajo o a un lado); puedes cambiar la posición con el menú ⋮ del panel o arrastrando.

## Pestañas que suelen usar primero

| Pestaña      | Para qué sirve                                                                 |
|--------------|-------------------------------------------------------------------------------|
| **Elements** | Ver y editar HTML/CSS en vivo, estilos computados, caja del modelo de caja. |
| **Console**  | Ver errores, `console.log`, ejecutar JavaScript corto.                       |
| **Sources**  | Depurar JS (breakpoints, paso a paso), ver archivos cargados.                 |
| **Network**  | Peticiones HTTP, tiempos, tamaños, bloqueo por recursos lentos.            |
| **Application** | Service Workers, almacenamiento (Local Storage, cookies, IndexedDB).    |
| **Performance** | Grabar la carga o la interacción y ver el timeline (CPU, pintura, JS).   |
| **Lighthouse**  | Informe automático de rendimiento, accesibilidad, SEO, PWA (auditoría en laboratorio). |

## Flujo mínimo recomendado

1. Abre tu web en Chrome y pulsa **F12**.
2. Ve a **Elements**: selecciona un nodo y prueba a activar o desactivar (toggle) clases o editar CSS para ver cambios al instante (no guardan en disco hasta que copies los cambios al código).
3. Ve a **Console**: recarga la página y revisa si hay errores en rojo.
4. Ve a **Network**: marca **Disable cache**, recarga, ordena por **Waterfall** o **Time** y localiza recursos lentos o fallidos.

## Lighthouse (rendimiento, integrado en DevTools)

1. Con DevTools abierto, pestaña **Lighthouse** (a veces bajo menú **>>** si no cabe).
2. Elige categorías (p. ej. **Performance**), dispositivo **Mobile** o **Desktop**, y **Analyze page load**.
3. Lee el informe: LCP, CLS, oportunidades (imágenes, JS, fuentes). Son datos de **laboratorio**; para usuarios reales combina con [PageSpeed Insights](https://pagespeed.web.dev/).

## Consejos útiles

- **Device toolbar** (`Ctrl+Shift+M` / `Cmd+Shift+M`): simula móvil y tamaños.
- **Settings** (engranaje en DevTools): idioma, temas, comportamiento del cursor.
- **Documentación oficial:** [Chrome DevTools](https://developer.chrome.com/docs/devtools/) (en inglés; muchas páginas tienen selector de idioma).

## Navegador integrado o MCP en Cursor (no es Chrome de tu PC)

Si con “esta herramienta” te refieres al **navegador integrado / MCP** en Cursor y no a Chrome en tu máquina: el flujo y los paneles pueden diferir, pero el objetivo (inspección, consola, red) es análogo. Asegúrate de que el conector **chrome-devtools** (u otro conector de depuración) aparezca activo en **Cursor → Settings → Tools & MCP**. En **Windows**, si el servidor MCP no arranca, configura el comando a **`npx.cmd`** en lugar de `npx` (problema habitual con la resolución de ejecutables en PowerShell).
