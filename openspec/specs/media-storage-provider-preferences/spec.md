# Media Storage Provider Preferences

Define la preferencia persistente por usuario del proveedor de almacenamiento de medios y sus restricciones operativas.

## Requisitos

### Requirement: Preferencia de proveedor de almacenamiento persistente por usuario
El sistema MUST persistir la preferencia de proveedor de almacenamiento multimedia por usuario autenticado en backend (no solo en almacenamiento local del navegador).

#### Scenario: Selección de proveedor en cuenta
- **WHEN** el usuario cambia su proveedor por defecto (por ejemplo `local`, `drive`, `r2` o `supabase`) en ajustes de almacenamiento
- **THEN** el sistema MUST guardar la preferencia en una entidad persistente asociada al `user_id`
- **AND** la operación MUST requerir sesión válida

#### Scenario: Recuperación de preferencia entre sesiones/dispositivos
- **WHEN** el usuario vuelve a iniciar sesión en otro navegador o dispositivo
- **THEN** la app MUST recuperar la preferencia persistida desde backend
- **AND** MUST aplicar ese proveedor como selección inicial en UI y flujos de subida

### Requirement: Consistencia entre preferencia persistida y estado operativo
La preferencia persistida MUST coordinarse con el estado real del proveedor para evitar selecciones inválidas silenciosas.

#### Scenario: Preferencia Drive sin conexión activa
- **WHEN** la preferencia persistida sea `drive` pero la conexión Drive esté `disconnected` o `reconnect-required`
- **THEN** la UI MUST informar el estado y requerir reconexión antes de confirmar subidas en Drive
- **AND** MUST ofrecer una alternativa funcional (`local` u otro proveedor disponible) sin pérdida de control del usuario

#### Scenario: Proveedor no soportado o inválido
- **WHEN** se intenta guardar un proveedor fuera del catálogo permitido
- **THEN** el backend MUST rechazar la actualización con error de validación
- **AND** MUST conservar la preferencia válida anterior

### Requirement: Seguridad y aislamiento de datos de preferencia
Las operaciones de lectura/escritura de preferencia MUST respetar aislamiento por usuario y controles de autorización.

#### Scenario: Usuario accede a su propia preferencia
- **WHEN** un usuario autenticado consulta o actualiza su preferencia
- **THEN** el sistema MUST permitir solo la fila asociada a su identidad autenticada

#### Scenario: Intento de acceso cruzado
- **WHEN** un cliente intenta leer o modificar la preferencia de otro usuario
- **THEN** el sistema MUST denegar la operación por autorización/RLS
