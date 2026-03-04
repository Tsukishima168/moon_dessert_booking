-- ============================================
-- 強制清理：刪除所有 orders 表的舊政策
-- ============================================

-- 逐個刪除可能存在的所有政策名稱
DROP POLICY IF EXISTS "anon_can_insert_orders" ON orders;
DROP POLICY IF EXISTS "authenticated_can_insert_orders" ON orders;
DROP POLICY IF EXISTS "authenticated_can_select_orders" ON orders;
DROP POLICY IF EXISTS "authenticated_can_update_orders" ON orders;
DROP POLICY IF EXISTS "anon_can_select_own_order" ON orders;

-- 刪除舊名稱的政策
DROP POLICY IF EXISTS "允許建立訂單" ON orders;
DROP POLICY IF EXISTS "允許管理員查看訂單" ON orders;
DROP POLICY IF EXISTS "允許管理員更新訂單" ON orders;
DROP POLICY IF EXISTS "Allow anonymous to create orders" ON orders;
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON orders;

-- 檢查是否還有其他政策
SELECT policyname FROM pg_policies WHERE tablename = 'orders';
