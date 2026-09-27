#!/usr/bin/env bash
# Imprime comandos supabase migration repair para migraciones ya absorbidas en baseline_public.sql
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
for f in "$ROOT"/supabase/migrations/[0-9]*.sql; do
  base=$(basename "$f" .sql)
  version="${base%%_*}"
  echo "supabase migration repair --status applied \"$version\""
done
