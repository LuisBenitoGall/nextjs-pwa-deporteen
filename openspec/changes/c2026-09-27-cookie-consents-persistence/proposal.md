# Propuesta: persistencia de consentimientos de cookies (`cookie_consents`)

## Contexto

El endpoint `POST /api/cookies/consent` inserta en `public.cookie_consents`, pero la tabla **no existe** en la base de referencia (inventario 27 tablas, septiembre 2026). Ningún consentimiento se almacena; el cliente solo guarda la preferencia en la cookie `dp_consent_v1`.

## Objetivos

1. Definir contrato OpenSpec (qué se registra, base legal, retención, acceso).
2. Crear tabla `cookie_consents` con RLS alineada al resto del proyecto.
3. Conectar el endpoint con tipos TypeScript y validación de payload.
4. Aplicar migración en la base de referencia y verificar políticas.

## Fuera de alcance

- Cambiar textos legales del banner o de `/legal/cookies` (solo versionar `consent_version`).
- Job automático de purga por retención (documentar; implementación cuando Luis confirme plazo).
- Almacenar dirección IP (minimización; ver spec).

## Riesgos

- Inserciones anónimas dependen de política `INSERT` para rol `anon`; fallos de RLS deben seguir sin bloquear navegación (respuesta `ok: false`).

## Verificación

- `pnpm lint`, `pnpm types`, `pnpm test:run`, `pnpm build`.
- SQL en base real: columnas, RLS, políticas.
