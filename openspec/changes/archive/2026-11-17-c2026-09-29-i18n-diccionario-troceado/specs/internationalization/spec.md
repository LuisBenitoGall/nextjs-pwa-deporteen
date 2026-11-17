# Delta — Internacionalización (troceado de diccionarios)

## ADDED Requirements

### Requirement: Núcleo de mensajes siempre disponible

El runtime MUST cargar un **núcleo** de claves (navegación, home, formularios públicos, etc.) en el primer render, sembrado con el locale por defecto en cliente y disponible en servidor sin bloques lazy.

#### Scenario: Visitante en la home

- **WHEN** se solicita `/`
- **THEN** el bundle inicial incluye solo el núcleo del locale activo (o el por defecto en el primer pintado)
- **AND** los textos visibles de la home no quedan vacíos

### Requirement: Bloques lazy por área

Los textos legales (`legal`) y el panel de administración Stripe (`admin_*`, `stripe_*` salvo claves usadas en rutas públicas) MUST residir en bloques separados importados bajo demanda.

#### Scenario: Página legal

- **WHEN** se solicita una ruta bajo `/legal/*`
- **THEN** el bloque `legal` se fusiona antes de renderizar el documento
- **AND** el HTML servido contiene el contenido legal traducido

#### Scenario: Panel admin

- **WHEN** se solicita una ruta bajo `/admin/*`
- **THEN** el bloque `admin` está disponible para los componentes del panel

### Requirement: Umbral del núcleo

El fichero `src/i18n/messages/es/core.json` MUST NOT superar `CORE_MESSAGES_MAX_BYTES_ES` bytes. Un test en la suite MUST fallar si se supera.
