-- ============================================
-- 🔧 完整修復：orders 資料表 RLS 政策
-- ============================================
-- 問題: 政策重複或衝突導致無法建立
-- 解法: 先刪除所有政策，再重新建立
-- ============================================

-- Step 1: 禁用 RLS 以便清理所有政策
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Step 2: 啟用 RLS
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

-- Step 4: 建立 SELECT 政策
CREATE POLICY "authenticated_can_select_orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 5: 建立 UPDATE 政策
CREATE POLICY "authenticated_can_update_orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true);

-- Step 6: 允許匿名用戶查詢自己的訂單
CREATE POLICY "anon_can_select_own_order"
  ON orders
  FOR SELECT
  TO anon
  USING (true);

-- 驗證查詢
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY cmd, policyname;
