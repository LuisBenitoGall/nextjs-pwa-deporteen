# Delta — Consentimiento de cookies

## ADDED Requirements

### Requirement: Registro auditable de preferencias de cookies

El sistema MUST persistir cada decisión del usuario o visitante sobre cookies no estrictamente necesarias en `public.cookie_consents`, además de la cookie cliente `dp_consent_v1`.

#### Scenario: Visitante sin sesión acepta analítica

- **WHEN** un visitante anónimo pulsa «Aceptar todo» en el banner
- **THEN** el cliente envía `POST /api/cookies/consent` con `consent_version` y `choices`
- **AND** se inserta una fila con `user_id` nulo y las categorías elegidas
- **AND** la navegación continúa aunque falle la inserción

#### Scenario: Usuario autenticado configura preferencias

- **WHEN** un usuario con sesión guarda preferencias en el panel de cookies
- **THEN** la fila insertada tiene `user_id = auth.uid()`
- **AND** el usuario puede leer solo sus propios registros vía RLS

### Requirement: Categorías y versión legal

Las categorías MUST coincidir con `ConsentChoices` en código: `necesarias` (siempre `true`), `analitica`, `funcionales`, `marketing`.

`consent_version` MUST identificar la versión del texto legal aceptado (p. ej. `v1`, alineado con `dp_consent_v1`).

#### Scenario: Payload inválido

- **WHEN** falta `choices` o `consent_version`, o `necesarias` no es `true`
- **THEN** el endpoint responde `400` sin escribir en base de datos

### Requirement: Minimización de datos

La tabla MUST almacenar únicamente lo necesario para demostrar el consentimiento:

| Campo | Obligatorio | Finalidad |
|-------|-------------|-----------|
| `id`, `created_at` | sí | Identificador y momento del consentimiento |
| `consent_version` | sí | Versión del texto legal |
| `choices` (jsonb) | sí | Categorías aceptadas/rechazadas |
| `user_id` | no | Titular autenticado |
| `device_id` | no | Correlación prudente de visitante sin cuenta (si el cliente lo envía) |
| `user_agent` | no | Contexto técnico en disputas (cadena acortada en servidor, máx. 512 caracteres) |

La dirección IP **MUST NOT** almacenarse en esta tabla (alternativa rechazada salvo decisión explícita de Luis).

### Requirement: Base legal (información, no asesoramiento jurídico)

| Categoría | Base legal propuesta |
|-----------|----------------------|
| Necesarias | Interés legítimo / ejecución técnica del servicio (sin registro en BD más allá del log de consentimiento global) |
| Analítica, funcionales, marketing | Consentimiento (art. 6.1.a RGPD y LSSI) |

### Requirement: Retención

**Pendiente confirmación Luis:** propuesta operativa — conservar filas **24 meses** desde `created_at` y purgar después (job no implementado en este change). La política de privacidad indica «consentimientos hasta revocación»; cada nueva decisión genera un registro nuevo; el plazo de conservación histórica debe alinearse con Luis.

### Requirement: Acceso y RLS

- Rol `authenticated`: `INSERT` solo con `user_id = auth.uid()`; `SELECT` solo filas propias.
- Rol `anon`: `INSERT` solo con `user_id IS NULL`; sin `SELECT`.
- Rol `service_role`: acceso completo (auditoría / operaciones).
- Sin `UPDATE` ni `DELETE` para clientes (registro append-only).

### Requirement: Comportamiento del endpoint

`POST /api/cookies/consent` MUST:

- Validar cuerpo JSON.
- Resolver `user_id` desde sesión Supabase si existe.
- Intentar `INSERT` con cliente de servidor (anon + cookies de sesión).
- En error de persistencia: responder **HTTP 200** con `{ ok: false, warning: 'consent_not_persisted' }` y log interno, **sin** impedir el uso de la PWA.

#### Scenario: Fallo de base de datos

- **WHEN** PostgREST devuelve error (tabla caída, RLS, red)
- **THEN** la respuesta es 200 con `ok: false`
- **AND** el cliente ya tiene la cookie local actualizada
