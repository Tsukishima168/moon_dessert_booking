-- ============================================================
-- 修復 orders 表 always-true SELECT 個資外洩漏洞（🔴 Critical）
-- ============================================================
-- 背景：/Users/pensoair/Desktop/Web-Projects/UPGRADE_PLAN.md 第 28-30 行
--   「shop_orders / shop_order_items / orders 的 always-true SELECT =
--    任何人可讀全部訂單個資」
-- 根因：orders 表 DDL 從沒走正式 migration，散在 scripts/*.sql
--   （SUPABASE_SETUP.sql / FIX_RLS_ORDERS.sql / FIX_RLS_ORDERS_COMPLETE.sql /
--   CLEANUP_POLICIES.sql）手動貼 Supabase Dashboard SQL Editor 執行。
--   這些 scripts 內容其實已是「安全版」寫法（authenticated 僅能讀
--   auth.uid() = user_id），但因為不是走正式 migration 流程，線上實際
--   狀態可能已被後續某次手動操作覆蓋回寬鬆版，repo 內容與線上真實狀態
--   不保證一致。
--
-- ============================================================
-- 【Step 0：套用前必做 —— 先核實線上實際 policy，不要假設 repo 內容為真】
-- ============================================================
--
--   SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
--   FROM pg_policies
--   WHERE tablename IN ('orders', 'shop_orders', 'shop_order_items')
--   ORDER BY tablename, cmd, policyname;
--
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN ('shop_orders', 'shop_order_items');
--
-- 若 orders 的 SELECT policy 的 qual 欄位是 "true"（或 USING (true)）
-- 且 roles 含 anon，就是本次要修的漏洞來源，此 migration 對症。
--
-- 若 shop_orders / shop_order_items 這兩個表「存在」，代表 UPGRADE_PLAN.md
-- 講的是本 repo 管理範圍外的另一組表（本 repo 的 migrations/scripts/src 內
-- 找不到這兩個表名的任何定義，程式碼實際用的是單數 orders，品項存在
-- orders.items JSONB，沒有獨立明細表）。此情況下本 migration 不涵蓋
-- shop_orders / shop_order_items，需另外定位其所屬 repo 處理，不可誤以為
-- 本檔已修完全部風險面。
--
-- ============================================================
-- 【影響面摘要】
-- ============================================================
-- orders 表個資曝露欄位：customer_name, phone, email, pickup_time,
--   delivery_address, delivery_notes, items（含金額品項）,
--   total_price/final_price, promo_code, linepay_transaction_id,
--   mbti_type, user_id, utm_* 來源追蹤欄位。
-- 任何持有 NEXT_PUBLIC_SUPABASE_ANON_KEY（前端打包產物內必然存在，非秘密）
-- 的人可直接 GET {SUPABASE_URL}/rest/v1/orders?select=* 免登入撈出全站訂單。
--
-- 前端/後端讀寫 orders 路徑盤點（本次稽核逐檔核實）：
--   - app/api/user/orders/route.ts → createAdminClient()（service_role）
--   - app/api/user/orders/[orderId]/route.ts → createClient()（帶 session 的
--     authenticated client）+ .eq('user_id', user.id) 應用層過濾
--     → 唯一真正吃到本 SELECT policy 的正常功能路徑，policy 收斂為
--       auth.uid() = user_id 後語意與應用層過濾一致，不受影響。
--   - src/repositories/order.repository.ts、marketing.repository.ts、
--     app/api/admin/**、app/api/payment/linepay/**、
--     app/api/cron/pickup-reminder/route.ts、app/order/success/page.tsx
--     → 全數使用 createAdminClient()（service_role，繞過 RLS）。
--   - lib/supabase.ts 的 getAllOrders() / updateOrderStatus()
--     → 原本用前端 anon client 直接 select('*') / update orders，
--       全庫掃描確認零呼叫端，本次稽核已判定為死代碼並移除
--       （見同次 commit 對 lib/supabase.ts 的修改）。
--
-- 結論：收斂為「anon 完全不能 SELECT、authenticated 只能讀自己」
-- 不會破壞任何現存正常功能。
--
-- ============================================================
-- 【Step 1：確保 RLS 開啟（冪等）】
-- ============================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 【Step 2：DROP 所有已知曾出現過的 orders policy 名稱】
-- （含 scripts/*.sql 歷史上出現過的中文舊名、英文舊名、各版本命名）
-- 若 Step 0 驗證查詢找到本清單以外的 policy 名稱，套用前需補列到這裡。
-- ============================================================
DROP POLICY IF EXISTS "允許建立訂單" ON public.orders;
DROP POLICY IF EXISTS "允許管理員查看訂單" ON public.orders;
DROP POLICY IF EXISTS "允許管理員更新訂單" ON public.orders;
DROP POLICY IF EXISTS "允許會員查看自己的訂單" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous to create orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous to read orders" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON public.orders;
DROP POLICY IF EXISTS "anon_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "anon_can_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "anon_can_select_own_order" ON public.orders;
DROP POLICY IF EXISTS "anon_select_orders" ON public.orders;
DROP POLICY IF EXISTS "public_select_orders" ON public.orders;
DROP POLICY IF EXISTS "authenticated_can_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "authenticated_can_select_orders" ON public.orders;
DROP POLICY IF EXISTS "authenticated_can_select_own_orders" ON public.orders;
DROP POLICY IF EXISTS "authenticated_can_update_orders" ON public.orders;

-- ============================================================
-- 【Step 3：重新建立收斂版 policy】
-- ============================================================

-- INSERT：訂單建立流程需要匿名與登入會員都能寫入（結帳頁未強制登入）
CREATE POLICY "anon_can_insert_orders"
  ON public.orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "authenticated_can_insert_orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SELECT：僅 authenticated 可讀「自己」的訂單；anon 完全不給 SELECT。
CREATE POLICY "authenticated_can_select_own_orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- UPDATE / DELETE：不建立任何 anon / authenticated policy。
-- 後台改單、狀態變更、LINE Pay callback 更新一律走 service_role
-- （createAdminClient()，見 src/repositories/order.repository.ts、
-- app/api/payment/linepay/**、app/api/admin/**），前端不應擁有
-- 寫入以外任何直接改動 orders 的權限。

-- ============================================================
-- 【Step 4：驗證查詢（套用後執行，確認與預期一致）】
-- ============================================================
-- SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'orders'
-- ORDER BY cmd, policyname;
--
-- 預期只剩 4 條 policy：
--   INSERT  / anon           / anon_can_insert_orders            / true
--   INSERT  / authenticated  / authenticated_can_insert_orders   / true
--   SELECT  / authenticated  / authenticated_can_select_own_orders / auth.uid() = user_id
-- 不應再有任何 anon 的 SELECT policy，也不應有任何 UPDATE/DELETE policy。
--
-- 套用後另需用「不帶登入 session、只帶 anon key」的 curl 直接打 REST API
-- 驗證 SELECT 已被擋下（預期回傳空陣列或 401/403，視 PostgREST 設定而定）：
--   curl "{SUPABASE_URL}/rest/v1/orders?select=*" \
--     -H "apikey: {NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
--     -H "Authorization: Bearer {NEXT_PUBLIC_SUPABASE_ANON_KEY}"

-- ============================================================
-- 【Rollback（僅在套用後發現正常功能被破壞時使用，且需回頭修正根因，
--   不可讓 rollback 變成長期狀態）】
-- ============================================================
-- BEGIN;
--
-- DROP POLICY IF EXISTS "authenticated_can_select_own_orders" ON public.orders;
--
-- -- 緊急恢復：僅恢復 authenticated 可讀自己訂單（與 Step 3 相同，作為確認基準）
-- CREATE POLICY "authenticated_can_select_own_orders"
--   ON public.orders
--   FOR SELECT
--   TO authenticated
--   USING (auth.uid() = user_id);
--
-- -- 若必須完全回退到 always-true（強烈不建議，僅作記錄用途，
-- -- 需業務主管明確簽核才可執行，執行前務必再次確認沒有更安全的替代方案）：
-- -- CREATE POLICY "authenticated_can_select_orders"
-- --   ON public.orders
-- --   FOR SELECT
-- --   TO authenticated
-- --   USING (true);
--
-- COMMIT;
