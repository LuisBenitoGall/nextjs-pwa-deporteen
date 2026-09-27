#!/usr/bin/env bash
# Regenera supabase/schema/baseline_public.sql desde SUPABASE_DB_URL (solo lectura).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PG_DUMP="${PG_DUMP:-/usr/lib/postgresql/17/bin/pg_dump}"
if [[ ! -x "$PG_DUMP" ]]; then
  echo "pg_dump 17 no encontrado. Instala postgresql-client-17 o define PG_DUMP." >&2
  exit 1
fi
ENV_FILE="$(mktemp)"
trap 'rm -f "$ENV_FILE"' EXIT
node scripts/supabase/pg-env-from-url.mjs "$ENV_FILE"
chmod 600 "$ENV_FILE"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
mkdir -p supabase/schema
OUT=supabase/schema/baseline_public.sql
"$PG_DUMP" \
  --schema-only \
  --no-owner \
  --schema=public \
  --file="$OUT"
# public ya existe en Postgres/Supabase vacío
sed -i '/^CREATE SCHEMA public;$/d' "$OUT"
sed -i '/^COMMENT ON SCHEMA public IS/d' "$OUT"
echo "Escrito $OUT ($(wc -l < "$OUT") líneas)"
