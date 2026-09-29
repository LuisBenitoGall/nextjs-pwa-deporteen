# Design: C2026-04-11-admin-mobile-layout

## Estado actual

`AdminLayout` (`src/app/admin/layout.tsx`) envuelve en un contenedor `flex` con dirección por defecto **fila** (`flex-row`):

- Primer hijo: `AdminSidebar` (varios nodos en fragmento).
- Segundo hijo: `div` con `flex-1` que contiene el `main`.

`AdminSidebar` en móvil renderiza, entre otros:

1. `aside` desktop (`hidden lg:flex`) — no participa en el flujo en móvil.
2. Barra superior móvil (`lg:hidden`) — **sí es un flex item** del contenedor padre.
3. Drawer y overlay (`fixed`) — fuera del flujo.

En un flex **row**, `align-items` por defecto es `stretch`. El flex item de la barra móvil **se estira en altura** al alto del viewport aunque el contenido interno sea `h-14`, lo que produce una columna visual ancha (fondo continuo) a la izquierda y empuja el `main` hacia la derecha — coherente con la captura de “banda vacía”.

## Dirección recomendada

- En viewports por debajo de `lg`, el contenedor raíz del layout admin MUST usar **columna** (`flex-col`), y en `lg+` **fila** (`lg:flex-row`), de modo que la barra móvil ocupe el ancho completo en la parte superior y el bloque del `main` quede debajo ocupando el ancho completo.
- Mantener el drawer como `fixed` / off-canvas sin ocupar espacio en el flujo cuando está cerrado.

## Alternativas descartadas (por ahora)

- Parche solo con `self-start` en la barra móvil: dejaría cabecera y `main` en dos columnas lado a lado, no el patrón “app móvil” deseado (cabecera full-bleed encima del contenido).
