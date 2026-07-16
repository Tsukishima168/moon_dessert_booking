-- Economy v2 adoption preflight.
--
-- This migration deliberately fails closed when the linked database does not
-- match the live contract inspected on 2026-07-15. It does not import legacy
-- balances and does not enable any Economy v2 write path.

DO $preflight$
DECLARE
  v_missing TEXT[];
BEGIN
  SELECT array_agg(object_name ORDER BY object_name)
  INTO v_missing
  FROM unnest(ARRAY[
    'auth.users',
    'public.orders',
    'public.mbti_claims',
    'public.point_transactions',
    'public.profiles',
    'public.reward_items',
    'public.reward_redemptions'
  ]) AS required(object_name)
  WHERE to_regclass(object_name) IS NULL;

  IF coalesce(array_length(v_missing, 1), 0) > 0 THEN
    RAISE EXCEPTION 'Economy v2 preflight failed; missing required relations: %',
      array_to_string(v_missing, ', ');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'points'
      AND data_type = 'integer'
  ) THEN
    RAISE EXCEPTION 'Economy v2 preflight failed; public.profiles.points is not integer';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'point_transactions'
      AND column_name = 'points'
      AND data_type = 'integer'
  ) THEN
    RAISE EXCEPTION 'Economy v2 preflight failed; public.point_transactions.points is not integer';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reward_items'
      AND column_name = 'reward_id'
      AND data_type = 'text'
  ) THEN
    RAISE EXCEPTION 'Economy v2 preflight failed; public.reward_items.reward_id is not text';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('order_id', 'text'),
      ('user_id', 'uuid'),
      ('status', 'text'),
      ('final_price', 'numeric'),
      ('total_price', 'integer')
    ) AS expected(column_name, data_type)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = 'orders'
        AND c.column_name = expected.column_name
        AND c.data_type = expected.data_type
    )
  ) THEN
    RAISE EXCEPTION 'Economy v2 preflight failed; public.orders reward contract drifted';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.orders'::regclass
      AND c.contype = 'u'
      AND c.conkey = ARRAY[(
        SELECT attnum::smallint
        FROM pg_attribute
        WHERE attrelid = 'public.orders'::regclass
          AND attname = 'order_id'
          AND NOT attisdropped
      )]::smallint[]
  ) THEN
    RAISE EXCEPTION 'Economy v2 preflight failed; public.orders.order_id is not unique';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('auth', 'users', 'id', 'uuid'),
      ('public', 'profiles', 'id', 'uuid'),
      ('public', 'point_transactions', 'user_id', 'uuid'),
      ('public', 'reward_items', 'name', 'text'),
      ('public', 'reward_items', 'points_cost', 'integer'),
      ('public', 'reward_items', 'category', 'text'),
      ('public', 'reward_items', 'redemption_method', 'text'),
      ('public', 'reward_items', 'is_active', 'boolean'),
      ('public', 'reward_redemptions', 'id', 'uuid'),
      ('public', 'reward_redemptions', 'user_id', 'uuid'),
      ('public', 'reward_redemptions', 'reward_id', 'text'),
      ('public', 'reward_redemptions', 'reward_name', 'text'),
      ('public', 'reward_redemptions', 'reward_category', 'text'),
      ('public', 'reward_redemptions', 'points_cost', 'integer'),
      ('public', 'reward_redemptions', 'redemption_code', 'text'),
      ('public', 'reward_redemptions', 'status', 'text'),
      ('public', 'reward_redemptions', 'source', 'text'),
      ('public', 'reward_redemptions', 'issued_at', 'timestamp with time zone'),
      ('public', 'reward_redemptions', 'expires_at', 'timestamp with time zone'),
      ('public', 'reward_redemptions', 'fulfilled_at', 'timestamp with time zone'),
      ('public', 'reward_redemptions', 'fulfilled_by', 'text'),
      ('public', 'reward_redemptions', 'metadata', 'jsonb')
    ) AS expected(table_schema, table_name, column_name, data_type)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = expected.table_schema
        AND c.table_name = expected.table_name
        AND c.column_name = expected.column_name
        AND c.data_type = expected.data_type
    )
  ) THEN
    RAISE EXCEPTION 'Economy v2 preflight failed; legacy reward contract drifted';
  END IF;

  IF EXISTS (SELECT 1 FROM public.reward_items WHERE points_cost <= 0) THEN
    RAISE EXCEPTION 'Economy v2 preflight failed; reward_items contains a non-positive points_cost';
  END IF;
END
$preflight$;

-- Adopt the already-applied 2026-07-04 Map RLS repair into the canonical Shop
-- migration history. Every statement is guarded because these legacy tables
-- are not required by Economy v2 itself.
DO $adopt_map_rls$
BEGIN
  IF to_regclass('public.shop_orders') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view shop orders" ON public.shop_orders';
  END IF;

  IF to_regclass('public.shop_order_items') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view shop order items" ON public.shop_order_items';
  END IF;

  IF to_regclass('public.special_eggs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.special_eggs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can update claimed_count" ON public.special_eggs';
  END IF;
END
$adopt_map_rls$;
