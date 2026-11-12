-- 2026-11-12：orders 的 SELECT policy 改成 initplan 寫法（效能，行為不變）
--
-- 背景（2026-11-11 全面檢查的 performance advisor：auth_rls_initplan，正式庫 xlqwfaailjyvsycjnzkz，Postgres 17.6）：
--   public.orders 只有一條 policy：authenticated_can_select_own_orders
--     PERMISSIVE / FOR SELECT / TO authenticated / USING (auth.uid() = user_id)
--   （2026-11-12 以唯讀查詢 pg_policies 確認；出處 20260704121625_harden_orders_rls.sql）
--   直接寫 auth.uid() 會讓 Postgres 逐列重算；包成 (select auth.uid()) 後整個查詢只算一次。
--   2026-07 那輪 initplan 批次改寫比這條 policy 早建立，所以漏了這一條。
--
-- 做法：ALTER POLICY 只換 USING 運算式。policy 名稱、適用指令（SELECT）、角色（authenticated）、
--   PERMISSIVE 都不變；沒有 DROP／CREATE，中間不會出現「沒有 policy」的空窗。
--   語意相同：未登入時 auth.uid() 為 NULL，NULL = user_id 不成立，一樣讀不到任何列。
--
-- 回滾：
--   alter policy authenticated_can_select_own_orders on public.orders using (auth.uid() = user_id);

alter policy authenticated_can_select_own_orders
  on public.orders
  using ((select auth.uid()) = user_id);
