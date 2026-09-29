# Cumplimiento Legal y Cookies

## Descripción

Conjunto de requisitos legales y de cumplimiento que rigen el uso de DeporTeen, con especial foco en:
- Tratamiento de datos de **menores de edad**.
- Gestión de **imágenes y vídeos** de menores.
- Política de **privacidad** y **términos de uso**.
- Gestión de **cookies** (consentimiento y categorías).
- Transparencia sobre almacenamiento local vs nube.

## Requisitos Funcionales

### RF-1: Información Legal Accesible

**Descripción**: El usuario debe poder acceder en todo momento a la información legal relevante.

**Criterios de Aceptación**:
- Existe una sección `/legal` con al menos:
  - Términos y Condiciones.
  - Política de Privacidad.
  - Política de Cookies.
  - Información específica sobre tratamiento de datos de menores.
- Los textos se sirven desde las claves `legal.*` de i18n.
- Los enlaces a estas páginas están visibles en el layout principal (footer o equivalente).

### RF-2: Gestión de Consentimiento de Cookies

**Descripción**: El usuario gestiona su consentimiento de cookies de forma granular.

**Criterios de Aceptación**:
- Al primer acceso se muestra un banner de cookies (`CookieBanner`) que:
  - Explica el uso de cookies.
  - Permite aceptar solo las necesarias, o configurar categorías.
- El consentimiento se persiste en una cookie propia (p.ej. `dp_consent_v1`) mediante la API `/api/cookies/consent`.
- El usuario puede reabrir y modificar sus preferencias desde `CookiePreferences`.
- Las categorías mínimas:
  - Necesarias (no desactivables).
  - Analítica.
  - Funcionales.
  - Marketing.

### RF-3: Activación Condicional de Analítica

**Descripción**: La carga de scripts de analítica depende del consentimiento.

**Criterios de Aceptación**:
- Google Analytics / gtag únicamente se inyecta en `layout.tsx` si:
  - El usuario ha dado consentimiento a la categoría correspondiente (p.ej. Analítica).
  - Existe un `G-XXXX` (o ID real) configurado.
- En ausencia de consentimiento se evita:
  - La carga del script remoto.
  - El envío de eventos de tracking.

### RF-4: Reglas sobre Menores y Responsables

**Descripción**: El sistema refleja técnicamente las reglas sobre menores descritas en los textos legales.

**Criterios de Aceptación**:
- Solo **adultos** pueden crear cuentas:
  - Los flujos de signup/login y los textos legales dejan claro que el usuario que se registra es un adulto responsable de los menores.
- Los menores no inician sesión ni interactúan directamente con el sistema (no hay campos de credenciales para menores).
- Las páginas legales describen:
  - Responsabilidad del adulto sobre los datos de los menores.
  - Limitaciones de uso de las imágenes y vídeos.
  - Procedimiento para solicitar supresión de datos.

### RF-5: Política sobre Contenidos Multimedia

**Descripción**: El tratamiento de fotos/vídeos de menores se alinea con los textos legales.

**Criterios de Aceptación**:
- Por defecto, los medios se almacenan **localmente** en el dispositivo (IndexedDB) y no se suben a la nube sin consentimiento explícito.
- Si se habilita almacenamiento en la nube (`NEXT_PUBLIC_CLOUD_MEDIA`):
  - Las páginas legales lo reflejan claramente.
  - Se documenta qué proveedor se usa (p.ej. Supabase Storage).
- La eliminación de un medio desde la app:
  - Borra su registro en BD (`match_media` o equivalente).
  - Intenta eliminar copias en storage remoto, si existen.
  - Anima al usuario a borrar copias locales si son gestionadas fuera de la app.

## Requisitos No Funcionales

- **Transparencia**: Toda funcionalidad que afecte a datos personales o imágenes debe estar respaldada por textos claros en `legal.*`.
- **Trazabilidad**: Cambios sustanciales en políticas legales deben ir asociados a una versión o fecha visible en la UI.
- **Localización**: Los textos legales deben estar al menos en el idioma base (`es`) y preferiblemente en los demás idiomas soportados.

## Modelo de Datos y Artefactos Relacionados

- No introduce nuevas tablas específicas, pero se apoya en:
  - Claves `legal.*` en `src/i18n/messages/*.json`.
  - Cookie de consentimiento (`dp_consent_v1` u otro nombre configurado) gestionada en la API de cookies.
- Los componentes implicados:
  - `CookieBanner`, `CookiePreferences`.
  - Páginas bajo `src/app/legal/*`.
  - Lógica de inyección de scripts en `src/app/layout.tsx`.

## Estados y Flujos

### Flujo de Consentimiento de Cookies

- Primera visita:
  1. Usuario accede a la app.
  2. No existe cookie de consentimiento.
  3. Se muestra `CookieBanner`.
  4. Usuario acepta/rechaza/configura.
  5. Se guarda cookie con las preferencias.

- Visitas posteriores:
  1. Se lee cookie de consentimiento.
  2. Se aplican preferencias (p.ej. no cargar analítica si no hay consentimiento).
  3. El usuario puede reabrir preferencias desde un enlace persistente.

### Flujo de Actualización Legal

- Cambio en textos legales o políticas:
  1. Se actualizan claves `legal.*` en los ficheros de i18n.
  2. Opcionalmente se incrementa una versión/fecha visible.
  3. Se comunica el cambio al usuario (banner o sección “Última actualización”).

## Casos de Uso

1. Usuario acepta todas las cookies al entrar por primera vez.
2. Usuario configura solo cookies necesarias y rechaza analítica/marketing.
3. Usuario reabre panel de preferencias y cambia su decisión.
4. Usuario consulta la política sobre imágenes de menores antes de subir un vídeo.
5. Operador del sistema actualiza textos legales tras cambio normativo.