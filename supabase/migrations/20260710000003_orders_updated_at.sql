-- =============================================================
-- 2026-07-10 orders.updated_at 欄位補齊
-- 背景：order.repository.ts:175 與 order-status-transition.service.ts:62
--       更新訂單狀態時寫入 updated_at，但表上從未有此欄位，
--       導致 PGRST204、後台無法變更任何訂單狀態（含取貨/取消通知鏈）。
-- 設計：nullable、無 default——由應用程式在每次更新時明確寫入，
--       NULL 代表建立後從未被更新過；不回填既有列（避免偽造審計時間）。
-- =============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.updated_at IS '最後一次狀態/內容更新時間；由應用層寫入，NULL=未曾更新';
