-- =============================================================
-- 2026-04-07 後端安全整理
-- 1. 修正 menu_items / menu_item_availability 的 RLS 匿名寫入漏洞
-- 2. 補 profiles.v2_unlocked_at 欄位（前端 V2App.tsx 依賴此欄位）
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

-- -------------------------------------------------------------
-- 3. 補 profiles.v2_unlocked_at
--    kiwimu-com V2App.tsx mount 時讀此欄位判斷付費解鎖狀態
--    由 shop webhook 寫入（service_role）
--    profiles RLS 已有 "service role 全權限" policy，webhook 可正常寫
-- -------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS v2_unlocked_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.profiles.v2_unlocked_at
  IS '付費解鎖 MBTI V2 的時間戳；由 shop webhook（service_role）寫入；NULL = 未解鎖';
