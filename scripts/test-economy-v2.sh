#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -z "${PG_BIN:-}" ]]; then
  if [[ -x "/opt/homebrew/opt/postgresql@17/bin/initdb" ]]; then
    PG_BIN="/opt/homebrew/opt/postgresql@17/bin"
  elif command -v pg_config >/dev/null 2>&1; then
    PG_BIN="$(dirname "$(command -v pg_config)")"
  else
    echo "PostgreSQL 17 tools are required; set PG_BIN to the directory containing initdb and psql." >&2
    exit 1
  fi
fi
case "$("$PG_BIN/pg_config" --version)" in
  "PostgreSQL 17."*) ;;
  *)
    echo "PostgreSQL 17 is required for the production-compatible Economy v2 suite." >&2
    exit 1
    ;;
esac
PORT="$((55400 + ($$ % 200)))"
DATA_DIR="$(mktemp -d /tmp/kiwimu-economy-v2-data.XXXXXX)"
SOCKET_DIR="$(mktemp -d /tmp/kiwimu-economy-v2-socket.XXXXXX)"
RESULT_DIR="$(mktemp -d /tmp/kiwimu-economy-v2-results.XXXXXX)"
DB_URL="postgresql://127.0.0.1:${PORT}/economy_v2_test?sslmode=disable"

cleanup() {
  "$PG_BIN/pg_ctl" -D "$DATA_DIR" -m fast stop >/dev/null 2>&1 || true
  find "$DATA_DIR" "$SOCKET_DIR" "$RESULT_DIR" -depth -delete 2>/dev/null || true
}
trap cleanup EXIT

"$PG_BIN/initdb" -D "$DATA_DIR" --no-locale --encoding=UTF8 --auth=trust >/dev/null
"$PG_BIN/pg_ctl" -D "$DATA_DIR" \
  -o "-h 127.0.0.1 -p $PORT -k $SOCKET_DIR" \
  -l "$DATA_DIR/postgres.log" start >/dev/null
"$PG_BIN/createdb" -h 127.0.0.1 -p "$PORT" economy_v2_test

PSQL=("$PG_BIN/psql" "$DB_URL" -X -v ON_ERROR_STOP=1)
"${PSQL[@]}" -f "$ROOT_DIR/supabase/tests/economy-v2/000_bootstrap_live_contract.sql" >/dev/null

for migration in "$ROOT_DIR"/supabase/migrations/2026071500000*.sql; do
  echo "Applying $(basename "$migration")"
  "${PSQL[@]}" -f "$migration" >/dev/null
done

PLPGSQL_CHECK_CONTROL="$("$PG_BIN/pg_config" --sharedir)/extension/plpgsql_check.control"
if [[ ! -f "$PLPGSQL_CHECK_CONTROL" ]]; then
  echo "Skipping Supabase db lint: plpgsql_check is unavailable in native PostgreSQL; run it in Supabase staging."
elif ! command -v supabase >/dev/null 2>&1; then
  echo "Skipping Supabase db lint: Supabase CLI is unavailable; run it in Supabase staging."
else
  PGSSLMODE=disable supabase db lint --db-url "$DB_URL" --level error --fail-on error
fi

"${PSQL[@]}" -f "$ROOT_DIR/supabase/tests/economy-v2/010_foundation_assertions.sql"
"${PSQL[@]}" -f "$ROOT_DIR/supabase/tests/economy-v2/015_role_boundary_assertions.sql"
"${PSQL[@]}" -f "$ROOT_DIR/supabase/tests/economy-v2/020_concurrency_setup.sql" >/dev/null

for i in $(seq 1 100); do
  (
    "${PSQL[@]}" -v idx="$i" \
      -f "$ROOT_DIR/supabase/tests/economy-v2/021_concurrent_deduct.sql" \
      >"$RESULT_DIR/deduct-$i.log" 2>&1 || true
  ) &
done
wait

for i in $(seq 1 20); do
  user_id="bbbbbbbb-bbbb-bbbb-bbbb-$(printf '%012d' "$i")"
  (
    "${PSQL[@]}" -v user_id="$user_id" \
      -f "$ROOT_DIR/supabase/tests/economy-v2/022_concurrent_stock.sql" \
      >"$RESULT_DIR/stock-$i.log" 2>&1 || true
  ) &
done
wait

for i in $(seq 1 20); do
  (
    "${PSQL[@]}" -v idx="$i" \
      -f "$ROOT_DIR/supabase/tests/economy-v2/023_concurrent_lifetime_activation.sql" \
      >"$RESULT_DIR/activation-$i.log" 2>&1 || true
  ) &
done
wait

"${PSQL[@]}" -f "$ROOT_DIR/supabase/tests/economy-v2/030_concurrency_assertions.sql"

echo "Economy v2 native PostgreSQL suite passed"
