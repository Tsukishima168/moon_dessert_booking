-- ============================================================
-- Phase 1 — 統一用戶 Profile
-- 目標：所有站台共用 profiles，登入即自動建檔，記錄來源站台
-- 執行：Supabase Dashboard > SQL Editor 貼上執行（冪等）
-- ============================================================

-- ── 1. 新增欄位到 profiles ────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email          TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url     TEXT,
  ADD COLUMN IF NOT EXISTS first_site     TEXT,       -- 第一次從哪站登入（mbti / passport / shop / map / gacha）
  ADD COLUMN IF NOT EXISTS last_seen_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_site TEXT;       -- 最後一次從哪站活動

-- ── 2. 索引 ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_email          ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at   ON public.profiles(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_first_site     ON public.profiles(first_site);

-- ── 3. 新用戶自動建檔 trigger ─────────────────────────────
-- 當 Supabase auth.users 有新用戶（Google OAuth / Magic Link），
-- 自動在 profiles 建一筆，取 Google 的 display_name / avatar_url / email

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    avatar_url,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)   -- fallback: email 前綴
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
    avatar_url   = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url);

  RETURN NEW;
END;
$$;

-- 先刪掉舊的（冪等）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── 4. 補建歷史用戶（已存在 auth.users 但沒有 profiles 的） ──

INSERT INTO public.profiles (id, email, display_name, avatar_url, created_at)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  u.raw_user_meta_data->>'avatar_url',
  u.created_at
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ── 5. RLS Policy：讓用戶能讀/更新自己的 profile ─────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: 用戶讀自己" ON public.profiles;
CREATE POLICY "profiles: 用戶讀自己"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles: 用戶更新自己" ON public.profiles;
CREATE POLICY "profiles: 用戶更新自己"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles: service role 全權限" ON public.profiles;
CREATE POLICY "profiles: service role 全權限"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ── 6. update_last_seen() — 前端（anon key）呼叫 ─────────
-- 用法：supabase.rpc('update_last_seen', { p_site: 'passport' })
-- SECURITY DEFINER → 用 auth.uid() 識別用戶，不需傳 user_id

CREATE OR REPLACE FUNCTION public.update_last_seen(p_site TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    last_seen_at   = NOW(),
    last_seen_site = p_site,
    first_site     = COALESCE(first_site, p_site)  -- 只寫一次
  WHERE id = auth.uid();
END;
$$;

-- ── 7. update_last_seen_for_user() — Server-side（service_role）呼叫 ──
-- 用法：supabase.rpc('update_last_seen_for_user', { p_user_id, p_site, p_now })
-- Shop（Next.js Server Action）用這個版本

CREATE OR REPLACE FUNCTION public.update_last_seen_for_user(
  p_user_id UUID,
  p_site    TEXT,
  p_now     TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    last_seen_at   = p_now,
    last_seen_site = p_site,
    first_site     = COALESCE(first_site, p_site)
  WHERE id = p_user_id;
END;
$$;
