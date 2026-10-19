#!/usr/bin/env bash
# 用法：bash scripts/legacy-rls/test-legacy-client-write.sh
# 在本機隔離 Postgres 重現 2026-10-19 正式庫舊表（campaigns / shop_orders / shop_order_items / signage_items
# 與三個 shop_* view）的權限現況，依序套用
#   20261009000000_restrict_campaigns_access.sql → 20261019120000_legacy_tables_revoke_client_write.sql（連套兩次）
# 後驗證：前端角色（anon / authenticated）對四張表的 INSERT/UPDATE/DELETE/TRUNCATE 全部 permission denied、
# 三張表與三個 view 的 SELECT 被拒、signage_items 的 SELECT 保留、service_role 的 SELECT/INSERT/UPDATE/DELETE 保留、
# 表層與欄位層級授權（含 PUBLIC）都清乾淨。不連任何遠端資料庫。
#
# 環境變數：
#   LEGACY_RLS_MIGRATION      指定要測的「新 migration」路徑（反向驗證用，見 run-mutants.sh）
#   LEGACY_RLS_SKIP_CAMPAIGNS 設 1 則不套 campaigns migration（模擬只套新檔）
#   PGTEST_PORT / PGTEST_SOCK_DIR  埠號／socket 目錄（socket 路徑上限約 103 bytes，保持簡短）
#   VERBOSE=1                 印出每一項檢查
# 結束碼：0 全過；1 有斷言失敗；2 migration 或工具執行失敗；3 fixture 沒有重現漏洞（測試本身無效）
set -euo pipefail
PORT="${PGTEST_PORT:-$((50000 + RANDOM % 10000))}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SOCK_BASE="${PGTEST_SOCK_DIR:-/tmp}"
T="$(mktemp -d)"; S="$(mktemp -d "$SOCK_BASE/pg.XXXX")"
trap 'pg_ctl -D "$T/data" stop >/dev/null 2>&1 || true; rm -rf "$T" "$S"' EXIT
MIG_CAMPAIGNS="$ROOT/supabase/migrations/20261009000000_restrict_campaigns_access.sql"
MIG="${LEGACY_RLS_MIGRATION:-$ROOT/supabase/migrations/20261019120000_legacy_tables_revoke_client_write.sql}"
SKIP_CAMPAIGNS="${LEGACY_RLS_SKIP_CAMPAIGNS:-0}"
export LC_ALL=en_US.UTF-8
[ -f "$MIG" ] || { echo "FATAL: migration not found: $MIG"; exit 2; }
rm -rf "$T/data"; initdb -D "$T/data" -U postgres --auth=trust >/dev/null 2>&1
pg_ctl -D "$T/data" -o "-k $S -p $PORT -c listen_addresses=''" -l "$T/pg.log" -w start >/dev/null
P=(psql -h "$S" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)
"${P[@]}" -c "create database t"
"${P[@]}" -d t -f "$ROOT/scripts/legacy-rls/fixture-before.sql"

TABLES="shop_orders shop_order_items campaigns signage_items"
VIEWS="shop_order_summary shop_daily_sales shop_product_performance"
TABLES_Q="'shop_orders','shop_order_items','campaigns','signage_items'"
ALL_RELS="$TABLES_Q,'shop_order_summary','shop_daily_sales','shop_product_performance'"
REL_VALUES="('shop_orders'),('shop_order_items'),('campaigns'),('signage_items'),('shop_order_summary'),('shop_daily_sales'),('shop_product_performance')"
U1='11111111-1111-1111-1111-111111111111'
SEED_ORDER='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
SVC_ORDER='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

CHECKS=0; FAILS=0
fail() { echo "FAIL: $*"; FAILS=$((FAILS+1)); }
okline() { if [ "${VERBOSE:-0}" = 1 ]; then echo "  ok: $*"; fi; }
sql() { "${P[@]}" -d t -tA -c "$1"; }   # 以 postgres 身分執行，失敗即中止

# 以指定角色（含 JWT claim）在 transaction 內執行單一語句後一律 rollback。回傳 OK / DENIED / ERROR:<訊息>
claims_for() {
  case "$1" in
    anon) echo "set local request.jwt.claim.role='anon';" ;;
    authenticated) echo "set local request.jwt.claim.role='authenticated'; set local request.jwt.claim.sub='$U1';" ;;
    service_role) echo "set local request.jwt.claim.role='service_role';" ;;
  esac
}
try_as() {
  local role="$1" stmt="$2" out rc=0
  out="$("${P[@]}" -d t -c "begin; set local role $role; $(claims_for "$role") $stmt; rollback;" 2>&1)" || rc=$?
  if [ "$rc" = 0 ]; then echo "OK"
  elif grep -qi 'permission denied' <<<"$out"; then echo "DENIED"
  else echo "ERROR:$(tail -1 <<<"$out" | cut -c1-90)"; fi
}
scalar_as() {  # role stmt → 單一值
  local role="$1" stmt="$2"
  "${P[@]}" -d t -tA -c "begin; set local role $role; $(claims_for "$role") $stmt; rollback;" 2>&1 | grep -v -e '^BEGIN$' -e '^SET$' -e '^ROLLBACK$' -e '^$' | tail -1
}
expect_try() {  # 說明 預期(OK|DENIED|RLS) 角色 語句
  local desc="$1" want="$2" role="$3" stmt="$4" got
  got="$(try_as "$role" "$stmt")"; CHECKS=$((CHECKS+1))
  case "$want:$got" in
    OK:OK|DENIED:DENIED) okline "$desc -> $got" ;;
    RLS:ERROR*row-level*) okline "$desc -> $got" ;;
    *) fail "$desc: expected $want, got $got" ;;
  esac
}
expect_eq() {
  local desc="$1" want="$2" got="$3"; CHECKS=$((CHECKS+1))
  if [ "$want" = "$got" ]; then okline "$desc"; else fail "$desc: expected [$want], got [$got]"; fi
}

insert_sql() { case "$1" in
  shop_orders) echo "insert into public.shop_orders(customer_name, phone, email, total) values ('probe','0','p@example.test',0)";;
  shop_order_items) echo "insert into public.shop_order_items(order_id, product_name, quantity, unit_price) values ('$SEED_ORDER','probe',1,0)";;
  campaigns) echo "insert into public.campaigns(name, subject, status) values ('probe','probe','draft')";;
  signage_items) echo "insert into public.signage_items(title, body) values ('probe','probe')";;
esac; }
update_sql() { case "$1" in
  shop_orders) echo "update public.shop_orders set status='probe'";;
  shop_order_items) echo "update public.shop_order_items set product_name='probe'";;
  campaigns) echo "update public.campaigns set name='probe'";;
  signage_items) echo "update public.signage_items set title='probe'";;
esac; }

# ---- 測試資料（僅測試用，非正式資料） ----
sql "insert into auth.users(id) values ('$U1'), ('22222222-2222-2222-2222-222222222222');
     insert into public.shop_orders(id, customer_name, phone, email, status, total) values ('$SEED_ORDER','seed','0900000000','seed@example.test','pending',100);
     insert into public.shop_order_items(order_id, product_name, quantity, unit_price) values ('$SEED_ORDER','seed',1,100);
     insert into public.campaigns(name, subject) values ('seed','seed');
     insert into public.signage_items(title, body) values ('seed','seed');" >/dev/null

# ---- BEFORE：確認 fixture 真的重現漏洞，否則後面的「通過」沒有意義 ----
echo "== BEFORE（未套用 migration）：fixture 必須重現漏洞 =="
expect_try "BEFORE anon INSERT shop_orders" OK anon "$(insert_sql shop_orders)"
expect_try "BEFORE anon INSERT shop_order_items" OK anon "$(insert_sql shop_order_items)"
expect_try "BEFORE anon INSERT campaigns" OK anon "$(insert_sql campaigns)"
expect_try "BEFORE authenticated INSERT signage_items" OK authenticated "$(insert_sql signage_items)"
expect_try "BEFORE anon INSERT signage_items 被 RLS 擋（證明 auth.role() stub 有效）" RLS anon "$(insert_sql signage_items)"
expect_try "BEFORE anon UPDATE shop_orders" OK anon "$(update_sql shop_orders)"
expect_try "BEFORE anon DELETE shop_order_items" OK anon "delete from public.shop_order_items"
expect_try "BEFORE anon TRUNCATE campaigns" OK anon "truncate table public.campaigns"
expect_try "BEFORE authenticated UPDATE signage_items" OK authenticated "$(update_sql signage_items)"
for v in $VIEWS; do expect_try "BEFORE anon SELECT view $v" OK anon "select * from public.$v"; done
expect_eq "BEFORE 欄位層級授權存在（fixture 有重現）" "t" "$(sql "select exists (select 1 from pg_attribute a join pg_class c on c.oid=a.attrelid where c.relname='shop_orders' and a.attacl is not null)")"
if [ "$FAILS" != 0 ]; then echo "FIXTURE 沒有重現漏洞（$FAILS 項），測試無效"; exit 3; fi
echo "fixture 已重現漏洞（$CHECKS 項）"

COUNTS_BEFORE="$(sql "select (select count(*) from public.shop_orders)||','||(select count(*) from public.shop_order_items)||','||(select count(*) from public.campaigns)||','||(select count(*) from public.signage_items)")"

# ---- 套用 migration ----
apply() {
  "${P[@]}" -d t -f "$1" >"$T/apply.log" 2>&1 || { cat "$T/apply.log"; echo "FATAL: migration 套用失敗: $1"; exit 2; }
}
echo "== 套用 migration =="
if [ "$SKIP_CAMPAIGNS" = 1 ]; then echo "（略過 campaigns migration）"; else apply "$MIG_CAMPAIGNS"; echo "applied: $(basename "$MIG_CAMPAIGNS")"; fi
apply "$MIG"; echo "applied (1/2): $(basename "$MIG")"
SNAP_SQL="select string_agg(x, E'\n' order by x) from (
  select 'rel|'||c.relname||'|'||coalesce(c.relacl::text,'')||'|rls='||c.relrowsecurity as x from pg_class c
    where c.relnamespace='public'::regnamespace and c.relname in ($ALL_RELS)
  union all select 'col|'||c.relname||'.'||a.attname||'|'||coalesce(a.attacl::text,'') from pg_attribute a
    join pg_class c on c.oid=a.attrelid where c.relnamespace='public'::regnamespace and c.relname in ($ALL_RELS)
    and a.attnum>0 and not a.attisdropped
  union all select 'policy|'||tablename||'|'||policyname||'|'||cmd||'|'||roles::text from pg_policies where schemaname='public'
) s"
SNAP1="$(sql "$SNAP_SQL")"
apply "$MIG"; echo "applied (2/2): $(basename "$MIG")"
SNAP2="$(sql "$SNAP_SQL")"
expect_eq "冪等：套用第二次後權限／policy 快照與第一次完全相同" "$SNAP1" "$SNAP2"
expect_eq "migration 為單一 transaction（BEGIN/COMMIT 各一次）" "1,1" "$(grep -c '^BEGIN;' "$MIG" || true),$(grep -c '^COMMIT;' "$MIG" || true)"

# ---- AFTER：前端寫入全拒 ----
echo "== AFTER：anon / authenticated =="
for r in anon authenticated; do
  for t in $TABLES; do
    expect_try "$r INSERT $t" DENIED "$r" "$(insert_sql "$t")"
    expect_try "$r UPDATE $t" DENIED "$r" "$(update_sql "$t")"
    expect_try "$r DELETE $t" DENIED "$r" "delete from public.$t"
    expect_try "$r TRUNCATE $t" DENIED "$r" "truncate table public.$t"
  done
  for t in shop_orders shop_order_items campaigns; do
    expect_try "$r SELECT $t" DENIED "$r" "select * from public.$t"
    expect_try "$r SELECT count(*) $t" DENIED "$r" "select count(*) from public.$t"
  done
  for v in $VIEWS; do expect_try "$r SELECT view $v" DENIED "$r" "select * from public.$v"; done
  expect_try "$r SELECT signage_items" OK "$r" "select * from public.signage_items"
  expect_eq "$r 讀 signage_items 取得 seed 那 1 筆（SELECT policy 仍有效）" "1" "$(scalar_as "$r" "select count(*) from public.signage_items")"
done

# ---- AFTER：service_role 照常可用，且 trigger 仍運作 ----
echo "== AFTER：service_role =="
for t in $TABLES; do
  expect_try "service_role SELECT $t" OK service_role "select count(*) from public.$t"
  expect_try "service_role INSERT $t" OK service_role "$(insert_sql "$t")"
  expect_try "service_role UPDATE $t" OK service_role "$(update_sql "$t")"
  expect_try "service_role DELETE $t" OK service_role "delete from public.$t where false"
done
for v in $VIEWS; do expect_try "service_role SELECT view $v" OK service_role "select * from public.$v"; done
# 真實寫入（commit）：以 service_role 寫入 → 更新 → 刪除，並用 postgres 身分核對結果與 trigger
"${P[@]}" -d t -c "set role service_role; set request.jwt.claim.role='service_role';
  insert into public.shop_orders(id, user_id, customer_name, total) values ('$SVC_ORDER','$U1','svc',50);
  insert into public.shop_order_items(order_id, product_name, quantity, unit_price) values ('$SVC_ORDER','svc',1,50);
  insert into public.campaigns(name) values ('svc');
  insert into public.signage_items(title) values ('svc');" >/dev/null || { echo "FATAL: service_role 真實寫入失敗"; exit 2; }
# 更新放在另一個 transaction，updated_at 才會晚於 created_at
"${P[@]}" -d t -c "set role service_role; set request.jwt.claim.role='service_role';
  update public.shop_orders set status='paid' where id='$SVC_ORDER';
  update public.shop_order_items set product_name='svc2' where order_id='$SVC_ORDER';
  update public.campaigns set name='svc2' where name='svc';
  update public.signage_items set title='svc2' where title='svc';" >/dev/null || { echo "FATAL: service_role 真實寫入失敗"; exit 2; }
expect_eq "service_role 真實寫入後四張表各多 1 筆且內容已更新" "2,2,2,2,paid" "$(sql "select (select count(*) from public.shop_orders)||','||(select count(*) from public.shop_order_items)||','||(select count(*) from public.campaigns)||','||(select count(*) from public.signage_items)||','||(select status from public.shop_orders where id='$SVC_ORDER')")"
expect_eq "trigger shop_profile_stats_trigger 仍運作（shop_profiles 有 U1）" "t" "$(sql "select exists (select 1 from public.shop_profiles where user_id='$U1' and order_count >= 1)")"
expect_eq "trigger shop_orders_updated_at_trigger 仍運作（updated_at 晚於 created_at）" "t" "$(sql "select updated_at > created_at from public.shop_orders where id='$SVC_ORDER'")"
"${P[@]}" -d t -c "set role service_role; set request.jwt.claim.role='service_role';
  delete from public.shop_order_items where order_id='$SVC_ORDER'; delete from public.shop_orders where id='$SVC_ORDER';
  delete from public.campaigns where name='svc2'; delete from public.signage_items where title='svc2';" >/dev/null || { echo "FATAL: service_role 真實刪除失敗"; exit 2; }
expect_eq "service_role 刪除後資料列數回到 migration 前（資料沒被動到）" "$COUNTS_BEFORE" "$(sql "select (select count(*) from public.shop_orders)||','||(select count(*) from public.shop_order_items)||','||(select count(*) from public.campaigns)||','||(select count(*) from public.signage_items)")"

# ---- AFTER：catalog（has_*_privilege 與 aclexplode 互相印證） ----
echo "== AFTER：catalog =="
expect_eq "has_table_privilege：anon/authenticated 只剩 signage_items 的 SELECT（含 PUBLIC 繼承）" "0" "$(sql "
  select count(*) from (values ('anon'),('authenticated')) r(role)
  cross join (values $REL_VALUES) t(rel)
  cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']
    || case when current_setting('server_version_num')::int >= 170000 then array['MAINTAIN'] else '{}'::text[] end) p(priv)
  where has_table_privilege(r.role, 'public.'||t.rel, p.priv) is distinct from (t.rel = 'signage_items' and p.priv = 'SELECT')")"
expect_eq "has_column_privilege：每個欄位 × SELECT/INSERT/UPDATE/REFERENCES，同樣只剩 signage_items 的 SELECT" "0" "$(sql "
  select count(*) from pg_attribute a join pg_class c on c.oid=a.attrelid
  cross join (values ('anon'),('authenticated')) r(role)
  cross join unnest(array['SELECT','INSERT','UPDATE','REFERENCES']) p(priv)
  where c.relnamespace='public'::regnamespace and c.relname in ($ALL_RELS) and a.attnum>0 and not a.attisdropped
    and has_column_privilege(r.role, c.oid, a.attnum, p.priv) is distinct from (c.relname='signage_items' and p.priv='SELECT')")"
expect_eq "表層 ACL（aclexplode）：PUBLIC/anon/authenticated 僅有 signage_items 的 SELECT" "signage_items:anon:SELECT signage_items:authenticated:SELECT" "$(sql "
  select coalesce(string_agg(c.relname||':'||coalesce(r.rolname,'PUBLIC')||':'||x.privilege_type, ' ' order by c.relname, r.rolname, x.privilege_type), '')
  from pg_class c cross join lateral aclexplode(c.relacl) x left join pg_roles r on r.oid = x.grantee
  where c.relnamespace='public'::regnamespace and c.relname in ($ALL_RELS) and (x.grantee = 0 or r.rolname in ('anon','authenticated'))")"
expect_eq "欄位層級 ACL（pg_attribute.attacl）：PUBLIC/anon/authenticated 一筆不剩" "0" "$(sql "
  select count(*) from pg_attribute a join pg_class c on c.oid=a.attrelid
  cross join lateral aclexplode(a.attacl) x left join pg_roles r on r.oid = x.grantee
  where c.relnamespace='public'::regnamespace and c.relname in ($ALL_RELS) and a.attnum>0 and not a.attisdropped
    and (x.grantee = 0 or r.rolname in ('anon','authenticated'))")"
expect_eq "service_role 對四張表仍有 SELECT/INSERT/UPDATE/DELETE（不是靠 PUBLIC 繼承）" "0" "$(sql "
  select count(*) from unnest(array['shop_orders','shop_order_items','campaigns','signage_items']) t(rel)
  cross join unnest(array['SELECT','INSERT','UPDATE','DELETE']) p(priv)
  where not has_table_privilege('service_role', 'public.'||t.rel, p.priv)")"
expect_eq "policy：shop_orders/shop_order_items/campaigns 不剩任何 policy，signage_items 只剩 SELECT policy" "signage_items:Public profiles are viewable by everyone.:SELECT" "$(sql "
  select coalesce(string_agg(tablename||':'||policyname||':'||cmd, ' | ' order by tablename, policyname), '') from pg_policies where schemaname='public'")"
expect_eq "四張表 RLS 仍開啟" "true,true,true,true" "$(sql "select string_agg(relrowsecurity::text, ',') from pg_class where relnamespace='public'::regnamespace and relname in ($TABLES_Q)")"
expect_eq "trigger 沒被動到（shop_orders 仍有兩個）" "shop_orders_updated_at_trigger shop_profile_stats_trigger" "$(sql "select string_agg(tgname, ' ' order by tgname) from pg_trigger where tgrelid='public.shop_orders'::regclass and not tgisinternal")"
expect_eq "三個 view 仍存在且 security_invoker" "3" "$(sql "select count(*) from pg_class where relnamespace='public'::regnamespace and relkind='v' and relname in ('shop_order_summary','shop_daily_sales','shop_product_performance') and reloptions @> array['security_invoker=true']")"
echo "relacl（audit）："; sql "select c.relname||' '||coalesce(c.relacl::text,'') from pg_class c where c.relnamespace='public'::regnamespace and c.relname in ($ALL_RELS) order by 1" | sed 's/^/  /'

# ---- 額外情境（各自用全新的 fixture 資料庫，互不影響） ----
echo "== 額外情境 =="
fresh_db() { "${P[@]}" -c "create database $1"; "${P[@]}" -d "$1" -f "$ROOT/scripts/legacy-rls/fixture-before.sql"; }
sqld() { "${P[@]}" -d "$1" -tA -c "$2"; }
# E1：view 不存在時略過，其餘照常完成
fresh_db e1
sqld e1 "drop view public.shop_order_summary, public.shop_daily_sales, public.shop_product_performance" >/dev/null
if "${P[@]}" -d e1 -f "$MIG" >"$T/e1.log" 2>&1; then CHECKS=$((CHECKS+1)); okline "E1 view 不存在時 migration 仍成功"; else fail "E1 view 不存在時 migration 失敗: $(tail -1 "$T/e1.log")"; fi
expect_eq "E1 三個 view 不存在時各印一則 skipped 提示" "3" "$(grep -c 'does not exist, skipped' "$T/e1.log" || true)"
expect_eq "E1 其餘照常完成（anon 對 shop_orders 已無 INSERT）" "f" "$(sqld e1 "select has_table_privilege('anon','public.shop_orders','INSERT')")"
# E2：表不存在時要失敗並整段回滾（避免套錯專案卻顯示成功）
fresh_db e2
sqld e2 "drop table public.signage_items" >/dev/null
if "${P[@]}" -d e2 -f "$MIG" >"$T/e2.log" 2>&1; then fail "E2 signage_items 不存在時 migration 應失敗"; else CHECKS=$((CHECKS+1)); okline "E2 表不存在時 migration 失敗"; fi
expect_eq "E2 失敗時整段回滾（shop_orders 的 policy 與授權都還在）" "1,true" "$(sqld e2 "select (select count(*) from pg_policies where policyname='Anyone can insert shop orders')||','||has_table_privilege('anon','public.shop_orders','INSERT')")"
# E3：欄位／表層授權是「別的授予者」授出的，owner 的 REVOKE 清不掉 → migration 必須失敗並列出殘留，不能顯示成功
fresh_db e3
sqld e3 "create role legacy_grantor nologin;
  grant select, insert, update, references on public.shop_orders to legacy_grantor with grant option;
  set role legacy_grantor;
  grant select (customer_name, phone, email), update (status) on public.shop_orders to anon;
  grant insert on public.shop_orders to authenticated;
  reset role" >/dev/null
if "${P[@]}" -d e3 -f "$MIG" >"$T/e3.log" 2>&1; then fail "E3 別的授予者授出的授權清不掉，migration 卻顯示成功"; else CHECKS=$((CHECKS+1)); okline "E3 殘留授權時 migration 失敗"; fi
expect_eq "E3 錯誤訊息列出殘留的授權" "1" "$(grep -c 'shop_orders.phone SELECT to anon' "$T/e3.log" || true)"
expect_eq "E3 失敗時整段回滾（policy 仍在、授權維持原狀）" "1,true" "$(sqld e3 "select (select count(*) from pg_policies where policyname='Anyone can insert shop orders')||','||has_table_privilege('authenticated','public.shop_orders','INSERT')")"

echo "checks: $CHECKS, failures: $FAILS"
if [ "$FAILS" = 0 ]; then echo "PASS: 前端寫入與個資讀取已關閉（四張表＋三個 view）、signage_items 讀取保留、service_role 正常、migration 冪等"; else exit 1; fi
