-- ============================================
-- 🔧 緊急修復：orders 資料表 RLS 政策
-- ============================================
-- 問題: 匿名用戶無法新增訂單，回傳 42501 (RLS violation)
-- 診斷: 2026-03-03 by Antigravity
-- 解法: 重新建立正確的 INSERT 政策
-- ============================================
-- 請在 Supabase Dashboard → SQL Editor 執行此腳本
-- ============================================

-- Step 1: 移除所有現有的 orders INSERT 政策（避免衝突）
DROP POLICY IF EXISTS "允許建立訂單" ON orders;
DROP POLICY IF EXISTS "Allow anonymous to create orders" ON orders;
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON orders;
DROP POLICY IF EXISTS "anon_can_insert_orders" ON orders;
DROP POLICY IF EXISTS "authenticated_can_insert_orders" ON orders;
DROP POLICY IF EXISTS "authenticated_can_select_orders" ON orders;
DROP POLICY IF EXISTS "authenticated_can_update_orders" ON orders;
DROP POLICY IF EXISTS "authenticated_can_select_own_orders" ON orders;
DROP POLICY IF EXISTS "anon_can_select_own_order" ON orders;

-- Step 2: 確認 RLS 已啟用（若未啟用，此步驟就是無效的）
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Step 3: 重新建立能讓匿名使用者與登入會員新增訂單的政策
CREATE POLICY "anon_can_insert_orders"
  ON orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "authenticated_can_insert_orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 4: 已認證會員只能讀取自己的訂單
-- 管理後台請走 server-side API / service_role，不要用 authenticated = 全站共用資料庫通行證
DROP POLICY IF EXISTS "允許管理員查看訂單" ON orders;
DROP POLICY IF EXISTS "允許管理員更新訂單" ON orders;
DROP POLICY IF EXISTS "允許會員查看自己的訂單" ON orders;

CREATE POLICY "authenticated_can_select_own_orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 5: 不建立 anon SELECT / authenticated UPDATE 政策
-- 若需要匿名查單，請改走受控 server API（例如一次性 token 或簽名連結）。
-- 若需要管理後台改單，請使用 service_role 或受控 RPC。

-- ============================================
-- 驗證查詢（執行後應看到上面建立的政策）
-- ============================================
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY cmd, policyname;
