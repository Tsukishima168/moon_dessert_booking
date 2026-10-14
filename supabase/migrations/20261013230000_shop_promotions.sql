-- Apply only after approval. Defaults preserve existing public promo codes.
BEGIN;
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS member_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS per_member_limit integer;
ALTER TABLE public.promo_codes ADD CONSTRAINT shop_promo_member_limit_check
  CHECK (per_member_limit IS NULL OR (per_member_limit > 0 AND member_only));
-- These are administrative discount instructions; all client access uses server routes.
REVOKE ALL PRIVILEGES ON public.promo_codes FROM PUBLIC, anon, authenticated;
DO $$ DECLARE item record; BEGIN
  FOR item IN SELECT attname FROM pg_attribute WHERE attrelid = 'public.promo_codes'::regclass
    AND attnum > 0 AND NOT attisdropped LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES (%I) ON TABLE public.promo_codes FROM PUBLIC, anon, authenticated', item.attname);
  END LOOP;
END $$;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO service_role;
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS link_text text DEFAULT '立即查看',
  ADD COLUMN IF NOT EXISTS details text,
  ADD COLUMN IF NOT EXISTS promo_code text;

CREATE TABLE public.shop_promo_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE RESTRICT,
  order_id text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  state text NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved', 'released')),
  subtotal numeric NOT NULL CHECK (subtotal >= 0),
  discount_amount numeric NOT NULL CHECK (discount_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shop_promo_member_usage_idx ON public.shop_promo_usages(promo_code_id, user_id)
  WHERE state = 'reserved';
CREATE INDEX IF NOT EXISTS shop_promo_legacy_order_idx ON public.orders(user_id, promo_code)
  WHERE checkout_site = 'shop';
ALTER TABLE public.shop_promo_usages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shop_promo_usages FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_promo_usages TO service_role;

-- Enforce rename safety under the same row lock as reservations (including old-server writes).
CREATE FUNCTION public.guard_shop_promo_code_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.code IS DISTINCT FROM OLD.code AND (
    coalesce(OLD.used_count, 0) > 0
    OR EXISTS (SELECT 1 FROM public.shop_promo_usages WHERE promo_code_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.orders WHERE promo_code = OLD.code AND checkout_site = 'shop')
  ) THEN
    RAISE EXCEPTION '此優惠已有使用紀錄，請保留原代碼並新增活動。' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_shop_promo_code_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_shop_promo_code_change BEFORE UPDATE OF code ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.guard_shop_promo_code_change();

-- Identity and subtotal are supplied by the Shop server, never by the browser.
-- The row lock serializes global and per-member reservations together.
CREATE FUNCTION public.reserve_shop_promo_usage(
  p_code text, p_subtotal numeric, p_user_id uuid, p_order_id text, p_expected_discount numeric
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  promo public.promo_codes%ROWTYPE;
  usage public.shop_promo_usages%ROWTYPE;
  member_count bigint;
  discount numeric;
BEGIN
  IF p_order_id IS NULL OR p_order_id !~ '^ORD-[A-F0-9]{16}$'
    OR p_subtotal IS NULL OR p_subtotal < 0 OR p_subtotal > 100000000 OR trunc(p_subtotal) <> p_subtotal THEN
    RETURN jsonb_build_object('ok', false, 'reason', '訂單資訊格式不正確。');
  END IF;
  SELECT * INTO promo FROM public.promo_codes WHERE code = upper(btrim(p_code)) FOR UPDATE;
  IF NOT FOUND OR NOT coalesce(promo.is_active, false) THEN
    RETURN jsonb_build_object('ok', false, 'reason', '找不到此優惠碼或活動已停用。');
  END IF;
  IF promo.valid_from IS NOT NULL AND promo.valid_from > now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', '此優惠碼尚未生效。');
  END IF;
  IF promo.valid_until IS NOT NULL AND promo.valid_until < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', '此優惠碼已過期。');
  END IF;
  IF p_subtotal < coalesce(promo.min_order_amount, 0) THEN
    RETURN jsonb_build_object('ok', false, 'reason', '訂單未達此優惠的最低消費。');
  END IF;
  IF promo.discount_value IS NULL OR promo.discount_value <= 0
    OR promo.discount_type IS NULL OR promo.discount_type NOT IN ('fixed', 'percentage')
    OR (promo.discount_type = 'percentage' AND (promo.discount_value > 100 OR trunc(promo.discount_value * 100) <> promo.discount_value * 100))
    OR (promo.discount_type = 'fixed' AND trunc(promo.discount_value) <> promo.discount_value) THEN
    RETURN jsonb_build_object('ok', false, 'reason', '此優惠設定有誤，請聯繫我們確認。');
  END IF;
  discount := least(p_subtotal, CASE WHEN promo.discount_type = 'percentage'
    THEN round(p_subtotal * promo.discount_value / 100) ELSE promo.discount_value END);
  IF p_expected_discount IS NULL OR discount <> p_expected_discount THEN
    RETURN jsonb_build_object('ok', false, 'reason', '優惠內容已變更，請重新確認折扣。');
  END IF;
  IF promo.member_only AND p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', '這是會員限定優惠，請先登入。');
  END IF;
  -- Retrying the same server-generated reservation is idempotent; it cannot change owner/pricing.
  SELECT * INTO usage FROM public.shop_promo_usages WHERE order_id = p_order_id;
  IF FOUND THEN
    IF usage.promo_code_id = promo.id AND usage.user_id IS NOT DISTINCT FROM p_user_id
      AND usage.subtotal = p_subtotal AND usage.discount_amount = discount AND usage.state = 'reserved' THEN
      RETURN jsonb_build_object('ok', true, 'id', usage.id);
    END IF;
    RETURN jsonb_build_object('ok', false, 'reason', '此訂單優惠紀錄需重新確認。');
  END IF;
  IF promo.max_uses IS NOT NULL AND coalesce(promo.used_count, 0) >= promo.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'reason', '此優惠碼已達使用上限。');
  END IF;
  IF promo.per_member_limit IS NOT NULL THEN
    IF p_user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', '請先登入使用此優惠。'); END IF;
    -- Include pre-migration orders and remove the overlap with new reservation rows.
    SELECT count(*) INTO member_count FROM (
      SELECT order_id FROM public.shop_promo_usages
        WHERE promo_code_id = promo.id AND user_id = p_user_id AND state = 'reserved'
      UNION
      SELECT order_id FROM public.orders
        WHERE user_id = p_user_id AND promo_code = promo.code AND checkout_site = 'shop'
    ) history;
    IF member_count >= promo.per_member_limit THEN
      RETURN jsonb_build_object('ok', false, 'reason', '你已達此優惠的使用次數上限。');
    END IF;
  END IF;
  INSERT INTO public.shop_promo_usages(promo_code_id, order_id, user_id, subtotal, discount_amount)
    VALUES(promo.id, p_order_id, p_user_id, p_subtotal, discount) RETURNING * INTO usage;
  UPDATE public.promo_codes SET used_count = coalesce(used_count, 0) + 1 WHERE id = promo.id;
  RETURN jsonb_build_object('ok', true, 'id', usage.id);
END $$;
REVOKE ALL ON FUNCTION public.reserve_shop_promo_usage(text, numeric, uuid, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_shop_promo_usage(text, numeric, uuid, text, numeric) TO service_role;

-- Only a known transaction rollback may release an allowance. Never release an existing order.
CREATE FUNCTION public.release_shop_promo_usage(p_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE usage public.shop_promo_usages%ROWTYPE; promo_id uuid;
BEGIN
  SELECT promo_code_id INTO promo_id FROM public.shop_promo_usages WHERE id = p_id;
  IF NOT FOUND THEN RETURN false; END IF;
  PERFORM 1 FROM public.promo_codes WHERE id = promo_id FOR UPDATE;
  SELECT * INTO usage FROM public.shop_promo_usages WHERE id = p_id FOR UPDATE;
  IF usage.state = 'released' THEN RETURN true; END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE order_id = usage.order_id) THEN RETURN false; END IF;
  UPDATE public.shop_promo_usages SET state = 'released' WHERE id = p_id;
  UPDATE public.promo_codes SET used_count = greatest(coalesce(used_count, 0) - 1, 0) WHERE id = promo_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.release_shop_promo_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_shop_promo_usage(uuid) TO service_role;

-- No name, email, IP address or member ID is collected for banner statistics.
CREATE TABLE public.shop_banner_events (
  banner_id uuid NOT NULL REFERENCES public.banners(id) ON DELETE CASCADE,
  impression_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('view', 'click')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (banner_id, impression_id, action)
);
ALTER TABLE public.shop_banner_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shop_banner_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_banner_events TO service_role;
CREATE INDEX shop_banner_event_retention_idx ON public.shop_banner_events(created_at);
CREATE TABLE public.shop_banner_rate_limits (
  key text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1
);
ALTER TABLE public.shop_banner_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shop_banner_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_banner_rate_limits TO service_role;
CREATE INDEX shop_banner_rate_retention_idx ON public.shop_banner_rate_limits(created_at);
CREATE FUNCTION public.record_shop_banner_event(p_banner_id uuid, p_impression_id uuid, p_action text, p_rate_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE inserted integer; viewed integer := 0; rate_count integer;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('view', 'click') OR p_impression_id IS NULL
    OR p_rate_key IS NULL OR p_rate_key !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.banners WHERE id = p_banner_id AND is_active = true
    AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now())) THEN RETURN false; END IF;
  INSERT INTO public.shop_banner_rate_limits(key) VALUES(p_rate_key)
    ON CONFLICT(key) DO UPDATE SET request_count = shop_banner_rate_limits.request_count + 1
      WHERE shop_banner_rate_limits.request_count < 30 RETURNING request_count INTO rate_count;
  IF rate_count IS NULL THEN RETURN false; END IF;
  IF p_action = 'click' THEN
    INSERT INTO public.shop_banner_events(banner_id, impression_id, action)
      VALUES(p_banner_id, p_impression_id, 'view') ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS viewed = ROW_COUNT;
  END IF;
  INSERT INTO public.shop_banner_events(banner_id, impression_id, action)
    VALUES(p_banner_id, p_impression_id, p_action) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 1 OR viewed = 1 THEN
    UPDATE public.banners SET
      view_count = coalesce(view_count, 0) + viewed + CASE WHEN p_action = 'view' THEN inserted ELSE 0 END,
      click_count = coalesce(click_count, 0) + CASE WHEN p_action = 'click' THEN inserted ELSE 0 END WHERE id = p_banner_id;
  END IF;
  -- Bound retention on the small analytics-only ledger; aggregate counts remain.
  DELETE FROM public.shop_banner_events WHERE created_at < now() - interval '30 days';
  DELETE FROM public.shop_banner_rate_limits WHERE created_at < now() - interval '1 hour';
  RETURN inserted = 1;
END $$;
REVOKE ALL ON FUNCTION public.record_shop_banner_event(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_shop_banner_event(uuid, uuid, text, text) TO service_role;
-- Retire the anonymous direct-counter bypass; function bodies remain for rollback/reference.
DO $$ BEGIN
  IF to_regprocedure('public.increment_banner_views(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.increment_banner_views(uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.increment_banner_views(uuid) TO service_role;
  END IF;
  IF to_regprocedure('public.increment_banner_clicks(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.increment_banner_clicks(uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.increment_banner_clicks(uuid) TO service_role;
  END IF;
END $$;
COMMIT;
