# Spec delta: Admin shell (responsive)

## ADDED Requirements

### Requirement: Shell administrativo responsive (móvil primero en comportamiento)

El layout del panel de administración MUST adaptar la navegación lateral y el área principal según el ancho del viewport, de forma que en móvil no quede espacio reservado vacío para la sidebar cuando el drawer está cerrado.

#### Scenario: Viewport móvil con sidebar cerrada

- **WHEN** el usuario abre cualquier pantalla del panel de administración en un viewport por debajo del breakpoint `lg` de Tailwind (u otro breakpoint explícito del proyecto si se unifica) y el drawer móvil no está abierto
- **THEN** el contenido principal (título, subtítulo, rejilla de tarjetas, tablas, etc.) ocupa el ancho completo del viewport (respetando padding del contenedor raíz) sin una columna vacía persistente a la izquierda y sin recorte lateral del contenido por falta de espacio

#### Scenario: Viewport móvil con sidebar abierta

- **WHEN** el usuario activa el menú (icono hamburguesa) en viewport móvil
- **THEN** la navegación lateral se presenta como panel superpuesto (drawer/overlay) que no desplaza de forma permanente el `main` fuera de pantalla, y el cierre del menú restaura el `main` a ancho completo en el flujo

#### Scenario: Sin scroll horizontal accidental

- **WHEN** el usuario navega el panel en móvil en las vistas típicas del dashboard administrativo
- **THEN** no aparece scroll horizontal global causado por el shell (salvo casos explícitos como tablas con scroll interno acotado)

---

## MODIFIED Requirements

### Requirement: Layout del panel en desktop

En viewports `lg` y superiores se mantiene la experiencia actual como referencia: sidebar visible en columna y área de contenido con proporciones actuales, salvo ajustes mínimos necesarios para compartir el mismo componente de shell entre breakpoints.

#### Scenario: Viewport desktop

- **WHEN** el viewport está en `lg` o superior
- **THEN** la sidebar permanece visible en el flujo (comportamiento actual con `lg:flex` en el `aside`) y el contenido principal conserva legibilidad y alineación, sin regresiones visibles en espaciado o jerarquía

#### Scenario: Transición entre breakpoints

- **WHEN** el usuario redimensiona la ventana entre móvil y desktop
- **THEN** el layout cambia de apilamiento vertical (cabecera móvil + `main`) a fila (sidebar + `main`) sin estados intermedios rotos (doble scrollbar por regresión obvia, o sidebar “fantasma” ocupando espacio en el flujo cuando debería estar oculta o ser drawer)
