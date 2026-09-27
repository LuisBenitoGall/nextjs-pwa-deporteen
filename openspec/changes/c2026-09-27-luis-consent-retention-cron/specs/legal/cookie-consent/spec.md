# Delta — Consentimiento de cookies (retención Luis 27/09/2026)

## MODIFIED Requirements

### Requirement: Retención

El sistema MUST conservar filas en `cookie_consents` durante **24 meses** desde `created_at` y MUST purgar automáticamente los registros más antiguos mediante el job diario `/api/cron/daily` (cliente `service_role`).

#### Scenario: Purga diaria

- **WHEN** el cron ejecuta y existen filas con `created_at` anterior al cutoff de 24 meses
- **THEN** esas filas se eliminan
- **AND** los registros dentro del plazo permanecen intactos

La política de privacidad MUST describir el plazo de **24 meses** (no «hasta revocación») para analítica y registros de consentimiento de cookies.
