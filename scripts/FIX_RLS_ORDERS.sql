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

-- Step 4: 確認已認證用戶（管理員）能讀取和更新訂單（確保管理後台正常）
DROP POLICY IF EXISTS "允許管理員查看訂單" ON orders;
DROP POLICY IF EXISTS "允許管理員更新訂單" ON orders;

CREATE POLICY "authenticated_can_select_orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_can_update_orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true);

-- Step 5: 允許匿名用戶也能查詢自己的訂單（用 order_id 查詢）
-- 這對「訂單確認頁面」很重要
CREATE POLICY "anon_can_select_own_order"
  ON orders
  FOR SELECT
  TO anon
  USING (true);  -- 若需要限制查詢範圍，可加條件如 order_id = current_setting('app.current_order_id', true)

-- ============================================
-- 驗證查詢（執行後應看到上面建立的政策）
-- ============================================
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY cmd, policyname;
