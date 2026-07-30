\set ON_ERROR_STOP on

INSERT INTO auth.users (id, email)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ledger-race@example.test');
INSERT INTO public.profiles (id)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

INSERT INTO auth.users (id, email)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'activation-race@example.test');
INSERT INTO public.profiles (id)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc');

SELECT economy_private.apply_ledger_entry(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  50,
  'grant',
  'system',
  'test_seed',
  'ledger-race',
  NULL,
  NULL,
  'test-seed-ledger-race',
  gen_random_uuid(),
  '{}'::jsonb
);

INSERT INTO public.reward_items
  (reward_id, name, points_cost, category, stock_mode, redemption_period_seconds)
VALUES ('stock-race', 'Stock Race Reward', 1, 'dessert', 'finite', 60);
INSERT INTO public.reward_stock_buckets (reward_id, quantity_total)
VALUES ('stock-race', 1);

INSERT INTO auth.users (id, email)
SELECT
  ('bbbbbbbb-bbbb-bbbb-bbbb-' || lpad(i::text, 12, '0'))::uuid,
  'stock-race-' || i || '@example.test'
FROM generate_series(1, 20) AS i;

INSERT INTO public.profiles (id)
SELECT ('bbbbbbbb-bbbb-bbbb-bbbb-' || lpad(i::text, 12, '0'))::uuid
FROM generate_series(1, 20) AS i;

DO $fund_stock_users$
DECLARE
  v_user_id UUID;
BEGIN
  FOR v_user_id IN
    SELECT ('bbbbbbbb-bbbb-bbbb-bbbb-' || lpad(i::text, 12, '0'))::uuid
    FROM generate_series(1, 20) AS i
  LOOP
    PERFORM economy_private.apply_ledger_entry(
      v_user_id, 10, 'grant', 'system', 'test_seed', 'stock-race',
      NULL, NULL, 'test-seed-stock-' || v_user_id::text, gen_random_uuid(), '{}'::jsonb
    );
  END LOOP;
END
$fund_stock_users$;
