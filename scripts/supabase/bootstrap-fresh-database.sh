#!/usr/bin/env bash
# Aplica baseline + seed en Postgres vacío (Supabase nuevo o verificación local).
# NO usar contra el proyecto Supabase de referencia ya poblado.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

TARGET_DB="${1:-}"
if [[ -z "$TARGET_DB" ]]; then
  echo "Uso: $0 '<postgresql://...>'" >&2
  echo "  o export DATABASE_URL=... && $0 \"\$DATABASE_URL\"" >&2
  exit 1
fi

PSQL="${PSQL:-/usr/lib/postgresql/17/bin/psql}"

apply() {
  local file=$1
  echo ">> $file"
  "$PSQL" "$TARGET_DB" -v ON_ERROR_STOP=1 -f "$file"
}

# Stub auth solo si no existe esquema auth (local)
if ! "$PSQL" "$TARGET_DB" -t -A -c "SELECT 1 FROM pg_namespace WHERE nspname='auth'" | grep -q 1; then
  apply supabase/schema/00_local_verify_auth_stub.sql
fi

apply supabase/schema/baseline_public.sql
apply supabase/schema/seed_reference_data.sql

echo "Bootstrap SQL completado. Marca migraciones históricas con:"
echo "  supabase migration repair --status applied <version>   (ver docs/versionar-esquema.md)"
