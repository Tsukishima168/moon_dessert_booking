#!/usr/bin/env bash
set -euo pipefail
PORT="${PGTEST_PORT:-$((50000 + RANDOM % 10000))}"
# 用法：bash scripts/orders-rls/test-orders-client-write.sh
# 在本機隔離 Postgres 重現 orders 現況（anon/authenticated 可寫），套用 20261018120000 migration 後驗證：
# 前端角色的 INSERT/UPDATE/DELETE/TRUNCATE 全拒、service_role 可寫、authenticated 仍可讀自己的訂單。不連任何遠端資料庫。
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
T="$(mktemp -d)"; S="$(mktemp -d /tmp/pg.XXXX)"; trap 'pg_ctl -D "$T/data" stop >/dev/null 2>&1; rm -rf "$T" "$S"' EXIT
MIG="${ORDERS_RLS_MIGRATION:-$ROOT/supabase/migrations/20261018120000_orders_revoke_client_write.sql}"  # 可指定其他檔做反向驗證
cp "$ROOT/scripts/orders-rls/fixture-before.sql" "$T/setup.sql"
export LC_ALL=en_US.UTF-8
rm -rf "$T/data"; initdb -D "$T/data" -U postgres --auth=trust >/dev/null 2>&1
pg_ctl -D "$T/data" -o "-k $S -p $PORT -c listen_addresses=''" -l "$T/pg.log" -w start >/dev/null
P=(psql -h "$S" -p $PORT -U postgres -v ON_ERROR_STOP=1 -q)
"${P[@]}" -c "create database t"
"${P[@]}" -d t -f "$T/setup.sql"
try() { local out; if out=$("${P[@]}" -d t -c "$1" 2>&1); then echo "OK"; else echo "DENIED ($(echo "$out" | tail -1 | cut -c1-60))"; fi; }
echo "BEFORE anon insert: $(try "set role anon; insert into public.orders(order_id, final_price) values ('before-anon', 0);")"
"${P[@]}" -d t -f "$MIG" && echo "migration applied"
for r in anon authenticated; do
  echo "AFTER $r insert:   $(try "set role $r; insert into public.orders(order_id, final_price) values ('after-$r', 0);")"
  echo "AFTER $r update:   $(try "set role $r; update public.orders set final_price=1;")"
  echo "AFTER $r delete:   $(try "set role $r; delete from public.orders;")"
  echo "AFTER $r truncate: $(try "set role $r; truncate public.orders;")"
done
echo "AFTER service_role insert: $(try "set role service_role; insert into public.orders(order_id, final_price) values ('after-service', 180);")"
"${P[@]}" -d t -c "insert into public.orders(order_id,user_id,final_price) values ('own','11111111-1111-1111-1111-111111111111',100)"
echo "AFTER authenticated select own rows: $("${P[@]}" -d t -tA -c "set role authenticated; set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111'; select count(*) from public.orders where order_id='own';" | tail -1)"
echo "policies: $("${P[@]}" -d t -tA -c "select string_agg(policyname, ', ') from pg_policies where tablename='orders'")"
echo "grants: $("${P[@]}" -d t -tA -c "select string_agg(grantee||':'||privilege_type, ' ' order by grantee, privilege_type) from information_schema.role_table_grants where table_name='orders' and grantee in ('anon','authenticated')")"
echo "rows: $("${P[@]}" -d t -tA -c "select string_agg(order_id, ',' order by order_id) from public.orders")"

# 斷言
fail=0
[ "$("${P[@]}" -d t -tA -c "select count(*) from pg_policies where tablename='orders' and cmd='INSERT'")" = "0" ] || { echo "FAIL: INSERT policy 仍存在"; fail=1; }
[ "$("${P[@]}" -d t -tA -c "select count(*) from information_schema.role_table_grants where table_name='orders' and grantee in ('anon','authenticated') and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')")" = "0" ] || { echo "FAIL: 前端角色仍有寫入授權"; fail=1; }
[ "$("${P[@]}" -d t -tA -c "select count(*) from public.orders where order_id like 'after-anon%' or order_id like 'after-authenticated%'")" = "0" ] || { echo "FAIL: 前端角色寫入成功"; fail=1; }
[ "$("${P[@]}" -d t -tA -c "select count(*) from public.orders where order_id='after-service'")" = "1" ] || { echo "FAIL: service_role 無法寫入"; fail=1; }
if [ $fail = 0 ]; then echo "PASS: orders 前端寫入已關閉，service_role 正常，authenticated 可讀自己的訂單"; else exit 1; fi
