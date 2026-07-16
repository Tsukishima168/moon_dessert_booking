-- Minimal production-contract fixture for native PostgreSQL migration tests.

DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END
$roles$;

CREATE SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE SCHEMA auth;

CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $function$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$function$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $function$
  SELECT nullif(current_setting('request.jwt.claim.role', true), '');
$function$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.role() TO anon, authenticated, service_role;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  source TEXT DEFAULT 'passport',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  total_price INTEGER NOT NULL DEFAULT 0,
  final_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.mbti_claims (
  code TEXT PRIMARY KEY,
  mbti_type TEXT NOT NULL,
  variant TEXT NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE TABLE public.reward_items (
  reward_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  category TEXT NOT NULL CHECK (category IN ('drink', 'dessert', 'merch')),
  redemption_method TEXT NOT NULL DEFAULT 'show-screen',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL REFERENCES public.reward_items(reward_id),
  reward_name TEXT NOT NULL,
  reward_category TEXT NOT NULL CHECK (reward_category IN ('drink', 'dessert', 'merch')),
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  redemption_code TEXT NOT NULL UNIQUE CHECK (char_length(btrim(redemption_code)) >= 10),
  status TEXT NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued', 'fulfilled', 'cancelled', 'expired')),
  source TEXT NOT NULL DEFAULT 'passport',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Emulate the permissive hosted baseline that Economy v2 must canonicalize.
GRANT ALL ON public.reward_items, public.reward_redemptions TO anon, authenticated;
ALTER TABLE public.reward_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY legacy_reward_items_all ON public.reward_items
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY legacy_reward_redemptions_all ON public.reward_redemptions
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.shop_orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.shop_order_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.special_eggs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claimed_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_eggs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shop orders" ON public.shop_orders FOR SELECT USING (true);
CREATE POLICY "Anyone can view shop order items" ON public.shop_order_items FOR SELECT USING (true);
CREATE POLICY "Anyone can update claimed_count" ON public.special_eggs FOR UPDATE USING (true);
