# Proposal: Shell administrativo responsive (móvil)

**Change:** C2026-04-11-admin-mobile-layout  
**Rule:** 10-architecture  

## Why

En viewport móvil el panel de administración muestra una banda vacía a la izquierda que comprime el contenido principal. El shell debe comportarse como una app móvil: área principal a ancho útil y navegación lateral sin reservar hueco en el flujo cuando el drawer está cerrado.

## What Changes

- Ajustar la composición del layout en `src/app/admin/layout.tsx` y/o `src/components/admin/AdminSidebar.tsx` para que en `<lg` el eje principal sea columna (cabecera móvil a ancho completo encima del `main`), manteniendo fila en desktop.
- Opcionalmente reforzar el patrón drawer (overlay, cierre con Escape, bloqueo de scroll) si queda alineado con el spec delta.
- Sin rediseño de marca ni cambios de permisos/datos.

## Capabilities

### New Capabilities

- `admin-shell`: requisitos de layout responsive del entorno `/admin` (delta en `specs/admin-shell/spec.md`).

### Modified Capabilities

- (Ninguno en `openspec/specs/` principal salvo merge posterior tras archivo; este change aporta solo delta bajo `changes/`.)

## Impact

- **Código:** `src/app/admin/layout.tsx`, posiblemente `src/components/admin/AdminSidebar.tsx`.
- **OpenSpec:** carpeta de change `openspec/changes/C2026-04-11-admin-mobile-layout/`.
- **Riesgo:** bajo; cambio de layout acotado a rutas `/admin`.
