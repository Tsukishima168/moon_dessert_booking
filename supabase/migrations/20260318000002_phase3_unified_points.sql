-- ============================================================
-- Phase 3 — 統一積分視圖
-- 目標：point_transactions（Passport/Gacha）與 point_logs（Shop）
--       可在同一個 View 查詢，不破壞現有資料結構
-- 執行：Supabase Dashboard > SQL Editor 貼上執行（冪等）
-- ============================================================

-- ── 1. point_transactions 加 user_id（登入時才填，允許 null） ──

ALTER TABLE public.point_transactions
  ADD COLUMN IF NOT EXISTS user_id UUID;      -- auth.users.id，SSO 後由 upsert_point_transaction 填入

CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id
  ON public.point_transactions(user_id);

-- ── 2. point_logs 加 source_site（Shop 用） ───────────────

ALTER TABLE public.point_logs
  ADD COLUMN IF NOT EXISTS source_site TEXT DEFAULT 'shop';

-- ── 3. 統一 View：v_point_history ─────────────────────────
-- 供 Passport 積分頁、後台報表使用

CREATE OR REPLACE VIEW public.v_point_history AS

-- point_transactions（Passport / Gacha）
SELECT
  pt.id,
  pt.user_id,
  pt.device_id,
  pt.points                           AS amount,
  pt.action                           AS reason,
  pt.description,
  COALESCE(pt.source, 'passport')     AS source_site,
  pt.created_at
FROM public.point_transactions pt

UNION ALL

-- point_logs（Shop）
SELECT
  pl.id,
  pl.user_id,
  NULL                                AS device_id,
  pl.amount,
  pl.reason,
  COALESCE(pl.metadata->>'description', pl.reason) AS description,
  COALESCE(pl.source_site, 'shop')    AS source_site,
  pl.created_at
FROM public.point_logs pl;

-- ── 4. 跨站積分總覽 View（每位登入用戶） ─────────────────

CREATE OR REPLACE VIEW public.v_user_points_summary AS
SELECT
  user_id,
  SUM(amount)                                                      AS total_points,
  COUNT(*)                                                         AS transaction_count,
  SUM(CASE WHEN source_site = 'shop'     THEN amount ELSE 0 END)  AS shop_points,
  SUM(CASE WHEN source_site = 'passport' THEN amount ELSE 0 END)  AS passport_points,
  SUM(CASE WHEN source_site = 'gacha'    THEN amount ELSE 0 END)  AS gacha_points,
  MIN(created_at)                                                  AS first_transaction_at,
  MAX(created_at)                                                  AS last_transaction_at
FROM public.v_point_history
WHERE user_id IS NOT NULL
GROUP BY user_id;

-- ── 5. upsert_point_transaction() ─────────────────────────
-- 取代前端直接 .from('point_transactions').insert(...)
-- 自動帶入 auth.uid()，讓積分記錄與登入用戶綁定

CREATE OR REPLACE FUNCTION public.upsert_point_transaction(
  p_device_id   TEXT,
  p_points      INTEGER,
  p_action      TEXT,
  p_description TEXT,
  p_source      TEXT DEFAULT 'passport'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.point_transactions (
    device_id,
    user_id,
    points,
    action,
    description,
    source
  )
  VALUES (
    p_device_id,
    auth.uid(),   -- NULL for anon, Supabase UUID for logged-in users
    p_points,
    p_action,
    p_description,
    p_source
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
