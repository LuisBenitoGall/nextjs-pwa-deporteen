# Tasks: C2026-04-11-admin-mobile-layout

## 1. Layout admin móvil vs desktop

- [x] 1.1 En `src/app/admin/layout.tsx`, usar `flex-col lg:flex-row` (u equivalente) en el contenedor raíz del shell autorizado, asegurando que por debajo de `lg` la barra móvil de `AdminSidebar` quede **encima** del bloque `main` a ancho completo.
- [x] 1.2 Comprobar en DevTools (p. ej. iPhone ancho) que no queda columna vacía persistente a la izquierda y que título, tarjetas y métricas usan el ancho útil sin recorte lateral.
- [x] 1.3 Comprobar en desktop (`lg+`) que el `aside` sigue visible a la izquierda y el `main` a la derecha sin regresiones de espaciado.

## 2. Drawer y accesibilidad (si aplica tras el cambio)

- [x] 2.1 Verificar overlay, cierre al pulsar fuera y navegación con `AdminNav`.
- [x] 2.2 (Opcional) `Escape` cierra el drawer y scroll del body bloqueado mientras está abierto.

## 3. Cierre

- [x] 3.1 Sin scroll horizontal global en vistas típicas del dashboard admin (salvo tablas con scroll interno explícito).
- [x] 3.2 Ejecutar lint/typecheck del proyecto si está en el flujo habitual.
