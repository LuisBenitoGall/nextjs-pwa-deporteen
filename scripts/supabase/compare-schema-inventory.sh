#!/usr/bin/env bash
# Compara conteos de objetos public con inventario DeporTeen (2026-09-27).
set -euo pipefail
PSQL="${PSQL:-psql}"
DB="${1:-${DATABASE_URL:-postgresql://postgres@127.0.0.1/deporteen_schema_verify}}"

query() {
  "$PSQL" "$DB" -t -A -c "$1" 2>/dev/null | tr -d ' '
}

tables=$(query "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'")
views=$(query "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='v'")
functions=$(query "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'")
policies=$(query "SELECT count(*) FROM pg_policies WHERE schemaname='public'")
triggers=$(query "SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal")

fail=0
check() {
  local name=$1 got=$2 exp=$3
  if [[ "$got" == "$exp" ]]; then
    echo "$name: $got OK"
  else
    echo "$name: $got (esperado $exp) DIFF"
    fail=1
  fi
}

check tables "$tables" 27
check views "$views" 3
check functions "$functions" 36
check policies "$policies" 67
check triggers "$triggers" 27
exit "$fail"
