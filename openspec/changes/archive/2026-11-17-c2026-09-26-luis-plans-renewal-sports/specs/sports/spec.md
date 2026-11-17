# Delta — Deportes (Luis 26/09/2026)

## ADDED Requirements

### Requirement: Lista cerrada versionada

El catálogo `public.sports` MUST sincronizarse con migración `20260926120000_seats_remaining_and_sports_catalog.sql` (9 deportes de equipo, IDs fijos).

### Requirement: Protocolo de alta de deporte

Cuando se apruebe un deporte nuevo, el equipo MUST seguir el protocolo en `openspec/specs/sports/spec.md` (migración, stats, i18n, icono, pruebas).
