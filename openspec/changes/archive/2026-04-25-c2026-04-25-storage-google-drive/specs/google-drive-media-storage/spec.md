## ADDED Requirements

### Requirement: Conexión persistente de Google Drive con OAuth servidor
El sistema MUST ofrecer una conexión de Google Drive persistente por usuario autenticado mediante OAuth Authorization Code Flow con almacenamiento servidor de credenciales renovables.

#### Scenario: Conexión inicial correcta
- **WHEN** un usuario autenticado inicia la conexión de Google Drive desde ajustes de almacenamiento
- **THEN** el sistema MUST redirigir a Google OAuth con `state` anti-CSRF y solicitar acceso offline cuando aplique
- **AND** tras callback válido MUST guardar el estado de conexión en backend sin exponer refresh tokens al cliente

#### Scenario: Estado de conexión consultable
- **WHEN** la UI de cuenta consulta el estado de Drive
- **THEN** el sistema MUST devolver un estado explícito (`connected`, `reconnect-required` o `disconnected`)
- **AND** la respuesta MUST permitir renderizar CTAs de reconexión/desconexión sin filtrar secretos

---

### Requirement: Subida de medios a Drive por ruta autenticada de servidor
Cuando el proveedor activo sea Drive, el sistema MUST subir fotos y videos mediante endpoint servidor autenticado que gestione refresh de token y persistencia de metadatos.

#### Scenario: Subida de medio con proveedor Drive
- **WHEN** un usuario autenticado sube un archivo en contexto de partido con proveedor `drive`
- **THEN** el backend MUST validar sesión y pertenencia del recurso antes de subir
- **AND** MUST refrescar acceso de Google en servidor si el token está expirado
- **AND** MUST persistir la referencia del archivo Drive en metadatos de media

#### Scenario: Falla de token o permisos Drive
- **WHEN** la subida falla por token revocado o permisos insuficientes
- **THEN** el sistema MUST devolver error controlado de reconexión requerida
- **AND** MUST NOT marcar el medio como subido en Drive

---

### Requirement: Resolución de galería con Drive como fuente de verdad
Para medios etiquetados como `drive`, la galería MUST resolver disponibilidad contra Drive y MUST NOT presentar como disponible un medio eliminado/inaccesible usando fallback local obsoleto.

#### Scenario: Archivo Drive movido pero válido
- **WHEN** un archivo se mueve en Drive conservando `fileId` y sigue accesible
- **THEN** la galería MUST seguir renderizando el medio como disponible

#### Scenario: Archivo Drive borrado o inaccesible
- **WHEN** Drive informa que el archivo no existe o no hay acceso
- **THEN** la galería MUST mostrar estado no disponible para ese medio
- **AND** MUST NOT usar `device_uri` local para aparentar disponibilidad de un medio `drive`

---

### Requirement: Desconexión y estados de error comprensibles
El sistema MUST permitir desconectar Google Drive y mostrar estados de error/reconexión de forma explícita en la UI de almacenamiento.

#### Scenario: Desconexión manual
- **WHEN** el usuario desconecta Drive desde cuenta
- **THEN** el sistema MUST revocar/eliminar el vínculo persistente y marcar estado `disconnected`
- **AND** los nuevos uploads MUST usar el proveedor activo resultante (por defecto local o el seleccionado)

#### Scenario: Reconexión requerida tras revocación externa
- **WHEN** Google invalida refresh token o el usuario revoca permisos fuera de la app
- **THEN** el sistema MUST pasar a estado `reconnect-required`
- **AND** MUST ofrecer CTA de reconexión sin romper los flujos `local` y `r2/supabase`
