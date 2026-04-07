-- =============================================================
-- 2026-04-07 後端安全整理
-- 修正 menu_items / menu_item_availability 的 RLS 匿名寫入漏洞
-- =============================================================

-- -------------------------------------------------------------
-- 1. 修正 menu_items 的 RLS
--    舊策略：auth.jwt() ->> 'role' = 'admin' OR (auth.uid()) IS NULL
--    問題：auth.uid() IS NULL = 匿名未登入請求，等同公開寫入
--    修正：移除 IS NULL 條件；service_role 本來就 bypass RLS，不需顯式放行
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Allow admin full access to menu items" ON public.menu_items;

CREATE POLICY "Allow admin full access to menu items"
  ON public.menu_items FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- -------------------------------------------------------------
-- 2. 修正 menu_item_availability 的 RLS（同樣問題）
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Allow admin full access to availability" ON public.menu_item_availability;

CREATE POLICY "Allow admin full access to availability"
  ON public.menu_item_availability FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
