#!/usr/bin/env bash
# 用法：bash scripts/legacy-rls/run-mutants.sh
# 反向驗證：對 20261019120000 migration 做刻意破壞（mutant），確認 test-legacy-client-write.sh 抓得到。
# 結束碼意義（見 test-legacy-client-write.sh）：1 = 測試斷言失敗；2 = migration 自己的事後檢查 [4] 擋下（套用失敗）。
# 因為 migration 內建事後檢查，「忘了收回權限」類的 mutant 會先被 [4] 擋成 exit 2；為了單獨證明「測試斷言」本身夠強，
# 這些 mutant 另外做一份「同時拿掉 [4]」的版本（-ng），預期以 exit 1 被測試斷言殺死。
# 先跑一次未破壞的版本當對照，必須通過（結束碼 0）。
#
# 例外：mutant a（拿掉逐欄位 REVOKE 迴圈）是「等價 mutant」，預期存活（結束碼 0），無法被任何測試殺死：
# Postgres 的表層 REVOKE 會連動收回同一授予者（表 owner）授出的欄位授權（官方文件 REVOKE 章節），
# 所以有沒有迴圈結果相同；授予者不是 owner 的授權則表層與逐欄位 REVOKE 都清不掉。
# 真正有風險的是後者，由 migration 的 [4] 事後檢查負責，對應 mutant h（拿掉 [4]）會被 E3 情境殺死（exit 1）。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REAL="$ROOT/supabase/migrations/20261019120000_legacy_tables_revoke_client_write.sql"
TEST="$ROOT/scripts/legacy-rls/test-legacy-client-write.sh"
M="$(mktemp -d)"; trap 'rm -rf "$M"' EXIT

# 刪掉指定編號的區段（從 "-- [n]" 標記到下一個標記或 COMMIT; 之前）
drop_section() { awk -v n="$1" 'BEGIN{p="^-- \\[" n "\\]"} /^-- \[[0-9]+\]/ {skip=($0 ~ p)} /^COMMIT;/{skip=0} !skip' "$2"; }
# 各種破壞方式（參數為來源檔）
no_col_loop()  { grep -v 'REVOKE ALL PRIVILEGES (%I)' "$1"; }
no_anon_sel()  { sed 's/^GRANT SELECT ON TABLE public.signage_items TO anon, authenticated;$/GRANT SELECT ON TABLE public.signage_items TO authenticated;/' "$1"; }
no_auth_sel()  { sed 's/^GRANT SELECT ON TABLE public.signage_items TO anon, authenticated;$/GRANT SELECT ON TABLE public.signage_items TO anon;/' "$1"; }
no_public()    { sed 's/FROM PUBLIC, anon, authenticated/FROM anon, authenticated/' "$1"; }
no_policy()    { grep -v '^DROP POLICY IF EXISTS' "$1"; }

grep -q 'REVOKE ALL PRIVILEGES (%I)' "$REAL" || { echo "FATAL: migration 沒有欄位層級 REVOKE，mutant a 無意義"; exit 2; }
drop_section 4 "$REAL" > "$M/ng.sql"                                   # 拿掉事後檢查的基底（= mutant h）
no_col_loop "$REAL"    > "$M/a.sql"
drop_section 3 "$REAL" > "$M/b.sql";  drop_section 3 "$M/ng.sql" > "$M/b-ng.sql"
no_anon_sel "$REAL"    > "$M/c.sql"
no_auth_sel "$REAL"    > "$M/c2.sql"
no_public "$REAL"      > "$M/e.sql";  no_public "$M/ng.sql"      > "$M/e-ng.sql"
drop_section 2 "$REAL" > "$M/f.sql";  drop_section 2 "$M/ng.sql" > "$M/f-ng.sql"
no_policy "$REAL"      > "$M/g.sql"

run() {  # 名稱 說明 檔案 skip_campaigns 預期結束碼
  local name="$1" desc="$2" file="$3" skip="$4" want="$5" rc=0 log="$M/$1.log"
  if [ "$name" != control ] && [ "$skip" = 0 ] && cmp -s "$file" "$REAL"; then echo "FATAL: mutant $name 與原檔相同（mutation 沒生效）"; exit 2; fi
  LEGACY_RLS_MIGRATION="$file" LEGACY_RLS_SKIP_CAMPAIGNS="$skip" bash "$TEST" >"$log" 2>&1 || rc=$?
  printf '| %-8s | %-42s | exit %s | %3s FAIL | %s\n' "$name" "$desc" "$rc" "$(grep -c '^FAIL:' "$log" || true)" "$(grep -m1 -e '^FAIL:' -e 'ERROR:  legacy' "$log" | cut -c1-84 || true)"
  echo "$name $rc $want" >> "$M/results"
}
: > "$M/results"
run control "未破壞（對照）"                              "$REAL"       0 0
run a       "缺欄位層級 revoke 迴圈（等價，預期存活）"      "$M/a.sql"    0 0
run b       "忘了 signage_items（[4] 擋下）"               "$M/b.sql"    0 2
run b-ng    "忘了 signage_items（無 [4]，靠測試斷言）"      "$M/b-ng.sql" 0 1
run c       "signage_items 沒還 anon SELECT"              "$M/c.sql"    0 1
run c2      "signage_items 沒還 authenticated SELECT"     "$M/c2.sql"   0 1
run d       "只套新檔、跳過 campaigns migration"           "$REAL"       1 1
run e       "沒從 PUBLIC 收回（[4] 擋下）"                 "$M/e.sql"    0 2
run e-ng    "沒從 PUBLIC 收回（無 [4]，靠測試斷言）"        "$M/e-ng.sql" 0 1
run f       "忘了三個 view（[4] 擋下）"                    "$M/f.sql"    0 2
run f-ng    "忘了三個 view（無 [4]，靠測試斷言）"           "$M/f-ng.sql" 0 1
run g       "沒刪 policy"                                 "$M/g.sql"    0 1
run h       "拿掉事後檢查 [4]（E3 情境殺死）"               "$M/ng.sql"   0 1

bad=0
while read -r name rc want; do
  [ "$rc" = "$want" ] || { echo "$name 預期 exit $want，實際 exit $rc"; bad=1; }
done < "$M/results"
[ "$bad" = 0 ] && echo "MUTANT CHECK OK：對照組 exit 0；a（等價）如預期存活；其餘皆被殺死（exit 1 = 測試斷言，exit 2 = migration 事後檢查）" || { echo "MUTANT CHECK FAILED"; exit 1; }
