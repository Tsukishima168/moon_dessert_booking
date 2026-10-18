-- 2026-10-18：關閉前端直接寫入 orders
--
-- 背景：20260704121625_harden_orders_rls.sql 為了「結帳頁未強制登入」開了
--   anon_can_insert_orders / authenticated_can_insert_orders（WITH CHECK (true)）。
--   但正式下單路徑早已全部改走伺服器：
--     - shop：app/api/order → order.service → order.repository（service role，經 insert_order_with_capacity_check）
--     - map：api/map-order.ts（service role）
--   前端從未直接 INSERT orders，這兩條 policy 只剩風險：任何人拿前端公開的 anon key
--   就能用 PostgREST 直接寫入任意金額（含 $0）的訂單，繞過伺服器的價格／產能／促銷驗證。
--   2026-10-18 已在正式庫確認兩條 policy 仍存在，且 anon/authenticated 擁有 INSERT/UPDATE/DELETE/TRUNCATE 授權。
--
-- 影響評估（2026-10-18 唯讀查詢正式庫）：
--   - 唯一寫入 orders 的函式 insert_order_with_capacity_check 為 SECURITY DEFINER，
--     anon/authenticated 沒有 EXECUTE；伺服器以 service role 呼叫，不受影響。
--   - check_daily_capacity（SECURITY INVOKER，anon/authenticated 可執行）只讀 orders，
--     所以保留 SELECT 授權（RLS 仍只讓 authenticated 讀自己的訂單）。
--   - passport 只以 authenticated 身分 SELECT 自己的訂單，不受影響。
--   - orders 上沒有任何 trigger。

BEGIN;

DROP POLICY IF EXISTS "anon_can_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "authenticated_can_insert_orders" ON public.orders;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.orders FROM anon, authenticated;

COMMIT;
