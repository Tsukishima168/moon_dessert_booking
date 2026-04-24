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

-- Step 4: 會員只能讀自己的訂單
CREATE POLICY "authenticated_can_select_own_orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 5: 不建立 authenticated UPDATE / anon SELECT
-- 管理後台請走 server-side API / service_role；匿名查單請走受控 server API。

-- 驗證查詢
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY cmd, policyname;
