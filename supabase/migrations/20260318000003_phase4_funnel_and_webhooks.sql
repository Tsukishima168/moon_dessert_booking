-- ============================================================
-- Phase 4 — 漏斗分析 View + n8n Webhook 觸發準備
-- 目標：可在 Supabase 直接查轉換率，並透過 Database Webhooks 觸發 n8n
-- 執行：Supabase Dashboard > SQL Editor 貼上執行（冪等）
-- ============================================================

-- ── 1. 完整用戶旅程 View ──────────────────────────────────
-- 把 profiles + user_events + v_user_points_summary 合起來
-- 每個用戶一行，清楚看到完整行為路徑

CREATE OR REPLACE VIEW public.v_user_journey AS
SELECT
  p.id                                        AS user_id,
  p.email,
  p.full_name,
  p.mbti_type,
  p.first_site,
  p.last_seen_site,
  p.last_seen_at,
  p.created_at                                AS registered_at,

  -- 各站首次到訪時間
  ue.mbti_at,
  ue.first_order_at,
  ue.first_stamp_at,
  ue.first_gacha_at,
  ue.first_checkin_at,

  -- 活動次數
  ue.order_count,
  ue.stamp_count,
  ue.gacha_count,

  -- 積分
  COALESCE(ps.total_points, 0)                AS total_points,
  COALESCE(ps.shop_points, 0)                 AS shop_points,
  COALESCE(ps.passport_points, 0)             AS passport_points,
  COALESCE(ps.gacha_points, 0)                AS gacha_points,

  -- 漏斗階段（最深的算）
  CASE
    WHEN ue.order_count > 0 AND ue.first_stamp_at IS NOT NULL THEN 'loyal'      -- 下單 + 集章
    WHEN ue.order_count > 0                                   THEN 'buyer'      -- 有下單
    WHEN ue.first_stamp_at IS NOT NULL OR ue.first_gacha_at IS NOT NULL
      OR ue.first_checkin_at IS NOT NULL                      THEN 'engaged'    -- 有互動
    WHEN ue.mbti_at IS NOT NULL                               THEN 'mbti_only'  -- 只做 MBTI
    ELSE                                                           'registered' -- 只是登入
  END                                         AS funnel_stage

FROM public.profiles p
LEFT JOIN public.user_funnel_summary  ue ON ue.user_id = p.id
LEFT JOIN public.v_user_points_summary ps ON ps.user_id = p.id;

-- ── 2. 漏斗轉換率 View ────────────────────────────────────
-- 一行看全站轉換

CREATE OR REPLACE VIEW public.v_funnel_conversion AS
SELECT
  COUNT(*)                                                              AS total_users,
  COUNT(CASE WHEN funnel_stage != 'registered' THEN 1 END)             AS active_users,
  COUNT(CASE WHEN mbti_type IS NOT NULL THEN 1 END)                    AS mbti_completed,
  COUNT(CASE WHEN funnel_stage IN ('buyer','loyal') THEN 1 END)        AS buyers,
  COUNT(CASE WHEN funnel_stage = 'loyal' THEN 1 END)                   AS loyal_users,

  -- 轉換率（百分比）
  ROUND(
    COUNT(CASE WHEN funnel_stage IN ('buyer','loyal') THEN 1 END)::NUMERIC
    / NULLIF(COUNT(*), 0) * 100, 1
  )                                                                     AS mbti_to_order_pct,

  ROUND(
    COUNT(CASE WHEN funnel_stage = 'loyal' THEN 1 END)::NUMERIC
    / NULLIF(COUNT(CASE WHEN funnel_stage IN ('buyer','loyal') THEN 1 END), 0) * 100, 1
  )                                                                     AS buyer_to_loyal_pct
FROM public.v_user_journey;

-- ── 3. n8n Webhook 觸發用 notify function ─────────────────
-- 設計：關鍵事件發生時，透過 pg_notify 通知，
-- 配合 Supabase Database Webhook（Dashboard 手動設定）觸發 n8n
--
-- Supabase Dashboard 設定路徑：
--   Database > Webhooks > Create webhook
--   Table: user_events, Events: INSERT
--   Method: POST, URL: https://kiwimu.app.n8n.cloud/webhook/supabase-events
--
-- 以下 function 供未來 trigger 使用（非 webhook 替代方案）

CREATE OR REPLACE FUNCTION public.notify_key_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 只對關鍵事件發 notify（避免噪音）
  IF NEW.event_type IN ('order_placed', 'stamp_earned', 'gacha_played', 'map_checkin') THEN
    PERFORM pg_notify(
      'kiwimu_user_event',
      json_build_object(
        'event_type', NEW.event_type,
        'site',       NEW.site,
        'user_id',    NEW.user_id,
        'metadata',   NEW.metadata,
        'created_at', NEW.created_at
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$;

-- user_events INSERT 觸發
DROP TRIGGER IF EXISTS trg_notify_key_event ON public.user_events;
CREATE TRIGGER trg_notify_key_event
  AFTER INSERT ON public.user_events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_key_event();

-- ── 4. 使用說明（給 n8n 設定者） ─────────────────────────
--
-- 選項 A（推薦）：Supabase Database Webhook
--   Dashboard > Database > Webhooks > New Webhook
--   - Table: user_events, Event: INSERT
--   - URL: https://kiwimu.app.n8n.cloud/webhook/supabase-user-event
--   - Headers: { "Authorization": "Bearer <n8n_webhook_token>" }
--
-- 選項 B：n8n Supabase Trigger Node（定期 poll）
--   - 每 5 分鐘查詢 user_events WHERE created_at > last_checked
--   - 適合低頻事件（簡單但有延遲）
--
-- 建議觸發的 n8n workflow：
--   order_placed  → 發 LINE 訂單確認 + 積分通知
--   stamp_earned  → 達到集章門檻時發 LINE 推播
--   map_checkin   → 發 LINE「到店打卡成功」通知
