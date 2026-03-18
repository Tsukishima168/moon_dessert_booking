-- ============================================================
-- Phase 2 — 跨站用戶行為追蹤
-- 目標：所有站台的關鍵動作統一寫入 user_events，供漏斗分析用
-- 執行：Supabase Dashboard > SQL Editor 貼上執行（冪等）
-- ============================================================

-- ── 1. user_events 主表 ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,                         -- nullable：未登入用戶也能記錄（anon）
  event_type  TEXT        NOT NULL,         -- 'stamp_earned' / 'gacha_played' / 'order_placed' / 'map_checkin' / 'quiz_completed'
  site        TEXT        NOT NULL,         -- 'passport' / 'gacha' / 'map' / 'shop' / 'mbti'
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. 索引 ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_events_user_id    ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON public.user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_site       ON public.user_events(site);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON public.user_events(created_at DESC);

-- 漏斗查詢常用組合索引
CREATE INDEX IF NOT EXISTS idx_user_events_user_event
  ON public.user_events(user_id, event_type, created_at DESC);

-- ── 3. RLS ────────────────────────────────────────────────

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- 用戶只能看自己的事件
DROP POLICY IF EXISTS "user_events: 用戶讀自己" ON public.user_events;
CREATE POLICY "user_events: 用戶讀自己"
  ON public.user_events FOR SELECT
  USING (auth.uid() = user_id);

-- Service role 全權限（後台 / n8n 用）
DROP POLICY IF EXISTS "user_events: service role 全權限" ON public.user_events;
CREATE POLICY "user_events: service role 全權限"
  ON public.user_events FOR ALL
  USING (auth.role() = 'service_role');

-- ── 4. insert_user_event() — 前端（anon key）呼叫 ─────────
-- 用法：supabase.rpc('insert_user_event', { p_event_type: 'stamp_earned', p_site: 'passport', p_metadata: { stamp_id: 'mbti_completed' } })
-- SECURITY DEFINER → 用 auth.uid()，anon key 也可寫入

CREATE OR REPLACE FUNCTION public.insert_user_event(
  p_event_type  TEXT,
  p_site        TEXT,
  p_metadata    JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.user_events (user_id, event_type, site, metadata)
  VALUES (auth.uid(), p_event_type, p_site, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── 5. insert_user_event_for_user() — Server-side（service_role）呼叫 ──
-- Shop（Next.js Server Action / EventBus handler）用這個版本

CREATE OR REPLACE FUNCTION public.insert_user_event_for_user(
  p_user_id     UUID,
  p_event_type  TEXT,
  p_site        TEXT,
  p_metadata    JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.user_events (user_id, event_type, site, metadata)
  VALUES (p_user_id, p_event_type, p_site, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── 6. 常用漏斗查詢 View（Phase 4 預備） ─────────────────
-- 每個 user 的事件時序概覽

CREATE OR REPLACE VIEW public.user_funnel_summary AS
SELECT
  u.user_id,
  MAX(CASE WHEN u.event_type = 'quiz_completed' THEN u.created_at END)  AS mbti_at,
  MAX(CASE WHEN u.event_type = 'order_placed'   THEN u.created_at END)  AS first_order_at,
  MAX(CASE WHEN u.event_type = 'stamp_earned'   THEN u.created_at END)  AS first_stamp_at,
  MAX(CASE WHEN u.event_type = 'gacha_played'   THEN u.created_at END)  AS first_gacha_at,
  MAX(CASE WHEN u.event_type = 'map_checkin'    THEN u.created_at END)  AS first_checkin_at,
  COUNT(CASE WHEN u.event_type = 'order_placed' THEN 1 END)             AS order_count,
  COUNT(CASE WHEN u.event_type = 'stamp_earned' THEN 1 END)             AS stamp_count,
  COUNT(CASE WHEN u.event_type = 'gacha_played' THEN 1 END)             AS gacha_count
FROM public.user_events u
WHERE u.user_id IS NOT NULL
GROUP BY u.user_id;
