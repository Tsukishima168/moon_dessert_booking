\set ON_ERROR_STOP on

INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'member@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'staff@example.test');
INSERT INTO public.profiles (id) VALUES
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');
INSERT INTO public.staff_members (user_id, role, location_ids)
VALUES ('22222222-2222-2222-2222-222222222222', 'staff', ARRAY['annan-store']);
INSERT INTO public.orders (order_id, user_id, total_price, final_price, status)
VALUES
  ('ORDER-TEST-1', '11111111-1111-1111-1111-111111111111', 500, 500, 'completed'),
  ('ORDER-TEST-SMALL', '11111111-1111-1111-1111-111111111111', 99, 99, 'completed'),
  ('ORDER-TEST-PENDING', '11111111-1111-1111-1111-111111111111', 500, 500, 'pending');

DO $default_rollout_gate$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.economy_rollout_config
    WHERE read_enabled OR shadow_write_enabled OR write_enabled OR redeem_enabled
       OR rollout_percentage <> 0 OR cardinality(allowlist) <> 0
  ) THEN
    RAISE EXCEPTION 'Economy v2 rollout flags are not default-off';
  END IF;
END
$default_rollout_gate$;

UPDATE public.economy_rollout_config
SET read_enabled = TRUE,
    shadow_write_enabled = TRUE,
    write_enabled = TRUE,
    redeem_enabled = TRUE,
    rollout_percentage = 100;

UPDATE public.economy_event_policies
SET reward_points = 10
WHERE policy_key = 'kiwimu.mbti_weekly';

SELECT set_config('request.jwt.claim.role', 'authenticated', false);
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

DO $idempotency$
DECLARE
  v_event JSONB := jsonb_build_object(
    'event_id', 'aaaaaaaa-1111-1111-1111-111111111111',
    'event_type', 'passport.daily_checkin',
    'occurred_at', now(),
    'source_site', 'passport',
    'actor_user_id', '11111111-1111-1111-1111-111111111111',
    'reference_id', 'checkin-2026-07-15',
    'evidence', '{}'::jsonb,
    'schema_version', 1
  );
  v_result JSONB;
BEGIN
  FOR i IN 1..100 LOOP
    v_result := public.economy_submit_event(v_event, gen_random_uuid());
    IF i = 1 AND (v_result ->> 'code') <> 'OK' THEN
      RAISE EXCEPTION 'first idempotency call failed: %', v_result;
    ELSIF i > 1 AND (v_result ->> 'code') <> 'ALREADY_PROCESSED' THEN
      RAISE EXCEPTION 'replay % was not idempotent: %', i, v_result;
    END IF;
  END LOOP;
END
$idempotency$;

DO $client_amount_attack$
DECLARE
  v_result JSONB;
BEGIN
  v_result := public.economy_submit_event(jsonb_build_object(
    'event_id', gen_random_uuid(),
    'event_type', 'passport.daily_checkin',
    'occurred_at', now(),
    'source_site', 'passport',
    'actor_user_id', '11111111-1111-1111-1111-111111111111',
    'reference_id', 'forged-amount',
    'evidence', '{}'::jsonb,
    'schema_version', 1,
    'amount', 999999
  ), gen_random_uuid());

  IF (v_result ->> 'code') <> 'NOT_ELIGIBLE' THEN
    RAISE EXCEPTION 'client amount attack was accepted: %', v_result;
  END IF;
END
$client_amount_attack$;

DO $client_period_attack$
DECLARE
  v_result JSONB;
BEGIN
  v_result := public.economy_submit_event(jsonb_build_object(
    'event_id', gen_random_uuid(),
    'event_type', 'passport.daily_checkin',
    'occurred_at', now() - interval '2 days',
    'source_site', 'passport',
    'actor_user_id', '11111111-1111-1111-1111-111111111111',
    'reference_id', 'forged-backdated-checkin',
    'evidence', '{}'::jsonb,
    'schema_version', 1
  ), gen_random_uuid());

  IF (v_result ->> 'code') <> 'LIMIT_REACHED' THEN
    RAISE EXCEPTION 'client backdated period bypass was accepted: %', v_result;
  END IF;
END
$client_period_attack$;

DO $event_identity_collision$
DECLARE
  v_result JSONB;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
  v_result := public.economy_submit_event(jsonb_build_object(
    'event_id', 'aaaaaaaa-1111-1111-1111-111111111111',
    'event_type', 'passport.activated',
    'occurred_at', now(),
    'source_site', 'passport',
    'actor_user_id', '22222222-2222-2222-2222-222222222222',
    'reference_id', 'cross-user-event-id-collision',
    'evidence', '{}'::jsonb,
    'schema_version', 1
  ), gen_random_uuid());

  IF (v_result ->> 'code') <> 'NOT_ELIGIBLE'
     OR v_result #> '{data,event_id}' IS NOT NULL THEN
    RAISE EXCEPTION 'cross-user event ID collision leaked or reused an event: %', v_result;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
END
$event_identity_collision$;

INSERT INTO public.economy_gacha_prizes
  (game_mode, prize_code, label, weight, points_delta, is_active)
VALUES ('daily_gacha', 'TEST-5', '測試 5 點', 1, 5, TRUE);
UPDATE public.economy_game_configs SET is_enabled = TRUE WHERE game_mode = 'daily_gacha';

DO $gacha$
DECLARE
  v_first JSONB;
  v_second JSONB;
BEGIN
  PERFORM set_config('TimeZone', 'Pacific/Kiritimati', false);
  v_first := public.play_daily_gacha(gen_random_uuid());
  PERFORM set_config('TimeZone', 'Etc/GMT+12', false);
  v_second := public.play_daily_gacha(gen_random_uuid());
  PERFORM set_config('TimeZone', 'UTC', false);
  IF (v_first ->> 'code') <> 'OK' OR (v_second ->> 'code') <> 'ALREADY_PROCESSED' THEN
    RAISE EXCEPTION 'gacha UTC-day atomic/idempotent test failed: %, %', v_first, v_second;
  END IF;
END
$gacha$;

DO $journey_events$
DECLARE
  v_result JSONB;
BEGIN
  v_result := public.economy_submit_event(jsonb_build_object(
    'event_id', gen_random_uuid(), 'event_type', 'passport.activated', 'occurred_at', now(),
    'source_site', 'passport', 'actor_user_id', '11111111-1111-1111-1111-111111111111',
    'reference_id', 'passport-activated-1', 'evidence', '{}'::jsonb, 'schema_version', 1
  ), gen_random_uuid());
  IF (v_result ->> 'code') <> 'OK' THEN
    RAISE EXCEPTION 'passport activation failed: %', v_result;
  END IF;

  v_result := public.economy_submit_event(jsonb_build_object(
    'event_id', gen_random_uuid(), 'event_type', 'passport.activated', 'occurred_at', now(),
    'source_site', 'passport', 'actor_user_id', '11111111-1111-1111-1111-111111111111',
    'reference_id', 'passport-activation-spam', 'evidence', '{}'::jsonb, 'schema_version', 1
  ), gen_random_uuid());
  IF (v_result ->> 'code') <> 'LIMIT_REACHED' THEN
    RAISE EXCEPTION 'passport lifetime activation limit failed: %', v_result;
  END IF;

  v_result := public.economy_submit_event(jsonb_build_object(
    'event_id', gen_random_uuid(), 'event_type', 'order.completed', 'occurred_at', now(),
    'source_site', 'shop', 'actor_user_id', '11111111-1111-1111-1111-111111111111',
    'reference_id', 'forged-order', 'evidence', '{}'::jsonb, 'schema_version', 1
  ), gen_random_uuid());
  IF (v_result ->> 'code') <> 'AUTH_REQUIRED' THEN
    RAISE EXCEPTION 'authenticated client forged privileged event: %', v_result;
  END IF;

  v_result := public.economy_submit_event(jsonb_build_object(
    'event_id', gen_random_uuid(), 'event_type', 'map.visit_confirmed', 'occurred_at', now(),
    'source_site', 'map', 'actor_user_id', '11111111-1111-1111-1111-111111111111',
    'reference_id', 'forged-map-proof', 'evidence', '{}'::jsonb, 'schema_version', 1
  ), gen_random_uuid());
  IF (v_result ->> 'code') <> 'AUTH_REQUIRED' THEN
    RAISE EXCEPTION 'authenticated client bypassed internal proof event: %', v_result;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', false);
  FOREACH v_result IN ARRAY ARRAY[
    public.economy_submit_event(jsonb_build_object(
      'event_id', gen_random_uuid(), 'event_type', 'mbti.completed', 'occurred_at', now(),
      'source_site', 'kiwimu', 'actor_user_id', '11111111-1111-1111-1111-111111111111',
      'reference_id', 'mbti-result-1', 'evidence', '{}'::jsonb, 'schema_version', 1
    ), gen_random_uuid()),
    public.economy_submit_event(jsonb_build_object(
      'event_id', gen_random_uuid(), 'event_type', 'order.completed', 'occurred_at', now(),
      'source_site', 'shop', 'actor_user_id', '11111111-1111-1111-1111-111111111111',
      'reference_id', 'ORDER-TEST-1', 'evidence', '{}'::jsonb, 'schema_version', 1
    ), gen_random_uuid())
  ] LOOP
    IF (v_result ->> 'code') <> 'OK' THEN
      RAISE EXCEPTION 'journey event failed: %', v_result;
    END IF;
  END LOOP;

  v_result := public.economy_submit_event(jsonb_build_object(
    'event_id', gen_random_uuid(), 'event_type', 'order.completed', 'occurred_at', now(),
    'source_site', 'shop', 'actor_user_id', '11111111-1111-1111-1111-111111111111',
    'reference_id', 'ORDER-TEST-SMALL', 'evidence', '{}'::jsonb, 'schema_version', 1
  ), gen_random_uuid());
  IF (v_result ->> 'code') <> 'OK'
     OR (v_result #>> '{data,awarded_points}')::integer <> 0 THEN
    RAISE EXCEPTION 'shop sub-100 order must award zero points: %', v_result;
  END IF;

  v_result := public.economy_submit_event(jsonb_build_object(
    'event_id', gen_random_uuid(), 'event_type', 'order.completed', 'occurred_at', now(),
    'source_site', 'shop', 'actor_user_id', '11111111-1111-1111-1111-111111111111',
    'reference_id', 'ORDER-TEST-PENDING', 'evidence', '{}'::jsonb, 'schema_version', 1
  ), gen_random_uuid());
  IF (v_result ->> 'code') <> 'NOT_ELIGIBLE' THEN
    RAISE EXCEPTION 'pending Shop order was rewarded: %', v_result;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'authenticated', false);
END
$journey_events$;

DO $visit_proof$
DECLARE
  v_issue JSONB;
  v_claim JSONB;
  v_proof TEXT;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
  v_issue := public.issue_store_visit_proof(NULL, 'annan-store', gen_random_uuid());
  IF (v_issue ->> 'code') <> 'OK' THEN
    RAISE EXCEPTION 'visit proof issue failed: %', v_issue;
  END IF;

  v_proof := v_issue #>> '{data,credential}';
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  v_claim := public.claim_store_visit_proof(v_proof, gen_random_uuid());
  IF (v_claim ->> 'code') <> 'OK' THEN
    RAISE EXCEPTION 'visit proof claim failed: %', v_claim;
  END IF;
END
$visit_proof$;

INSERT INTO public.reward_items
  (reward_id, name, points_cost, category, stock_mode)
VALUES ('foundation-reward', 'Foundation Reward', 10, 'dessert', 'finite');
INSERT INTO public.reward_stock_buckets (reward_id, quantity_total)
VALUES ('foundation-reward', 1);

DO $redemption$
DECLARE
  v_redeem JSONB;
  v_fulfill JSONB;
  v_repeat JSONB;
  v_credential TEXT;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  v_redeem := public.redeem_reward_item('foundation-reward', gen_random_uuid());
  IF (v_redeem ->> 'code') <> 'OK' THEN
    RAISE EXCEPTION 'redemption failed: %', v_redeem;
  END IF;

  v_credential := v_redeem #>> '{data,credential}';
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
  v_fulfill := public.fulfill_reward_redemption(v_credential, gen_random_uuid());
  v_repeat := public.fulfill_reward_redemption(v_credential, gen_random_uuid());
  IF (v_fulfill ->> 'code') <> 'OK' OR (v_repeat ->> 'code') <> 'ALREADY_PROCESSED' THEN
    RAISE EXCEPTION 'fulfillment idempotency failed: %, %', v_fulfill, v_repeat;
  END IF;
END
$redemption$;

SELECT set_config('request.jwt.claim.role', 'service_role', false);
SELECT set_config('request.jwt.claim.sub', '', false);

DO $reversal$
DECLARE
  v_result JSONB;
BEGIN
  v_result := public.reverse_point_reference('shop', 'ORDER-TEST-1', 'test refund', gen_random_uuid());
  IF (v_result ->> 'code') <> 'OK' THEN
    RAISE EXCEPTION 'reversal failed: %', v_result;
  END IF;
END
$reversal$;

DO $partial_reversal$
DECLARE
  v_user_id UUID := '44444444-4444-4444-4444-444444444444';
  v_first JSONB;
  v_replay JSONB;
  v_second JSONB;
  v_final JSONB;
  v_balance BIGINT;
  v_reversal_count INTEGER;
  v_reversal_sum BIGINT;
  v_lifetime_spent BIGINT;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (v_user_id, 'partial-success@example.test');
  INSERT INTO public.profiles (id) VALUES (v_user_id);
  PERFORM economy_private.apply_ledger_entry(
    v_user_id, 10, 'earn', 'shop', 'order.completed', 'ORDER-PARTIAL-SUCCESS',
    NULL, NULL, 'partial-success-earn', gen_random_uuid(), '{}'::jsonb
  );

  v_first := public.reverse_point_reference(
    'shop', 'ORDER-PARTIAL-SUCCESS', 'REFUND-PARTIAL-1', 3,
    'first partial refund', gen_random_uuid()
  );
  v_replay := public.reverse_point_reference(
    'shop', 'ORDER-PARTIAL-SUCCESS', 'REFUND-PARTIAL-1', 3,
    'first partial refund replay', gen_random_uuid()
  );
  v_second := public.reverse_point_reference(
    'shop', 'ORDER-PARTIAL-SUCCESS', 'REFUND-PARTIAL-2', 2,
    'second partial refund', gen_random_uuid()
  );
  v_final := public.reverse_point_reference(
    'shop', 'ORDER-PARTIAL-SUCCESS', 'final full refund', gen_random_uuid()
  );

  IF (v_first ->> 'code') <> 'OK'
     OR (v_replay ->> 'code') <> 'ALREADY_PROCESSED'
     OR (v_second ->> 'code') <> 'OK'
     OR (v_final ->> 'code') <> 'OK' THEN
    RAISE EXCEPTION 'partial reversal sequence failed: %, %, %, %',
      v_first, v_replay, v_second, v_final;
  END IF;

  SELECT balance, lifetime_spent
  INTO v_balance, v_lifetime_spent
  FROM public.point_accounts
  WHERE user_id = v_user_id;

  SELECT count(*), coalesce(sum(delta), 0)
  INTO v_reversal_count, v_reversal_sum
  FROM public.point_ledger
  WHERE reversal_of = (
    SELECT id FROM public.point_ledger
    WHERE idempotency_key = 'partial-success-earn'
  );

  IF v_balance <> 0
     OR v_lifetime_spent <> 0
     OR v_reversal_count <> 3
     OR v_reversal_sum <> -10 THEN
    RAISE EXCEPTION 'partial reversal accounting mismatch: balance %, spent %, rows %, sum %',
      v_balance, v_lifetime_spent, v_reversal_count, v_reversal_sum;
  END IF;
END
$partial_reversal$;

DO $atomic_reversal_failure$
DECLARE
  v_user_id UUID := '33333333-3333-3333-3333-333333333333';
  v_result JSONB;
  v_balance BIGINT;
  v_reversals INTEGER;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (v_user_id, 'reversal@example.test');
  INSERT INTO public.profiles (id) VALUES (v_user_id);
  PERFORM economy_private.apply_ledger_entry(
    v_user_id, 2, 'earn', 'shop', 'order.completed', 'ORDER-PARTIAL',
    NULL, NULL, 'partial-earn-1', gen_random_uuid(), '{}'::jsonb
  );
  PERFORM economy_private.apply_ledger_entry(
    v_user_id, 8, 'earn', 'shop', 'order.completed', 'ORDER-PARTIAL',
    NULL, NULL, 'partial-earn-2', gen_random_uuid(), '{}'::jsonb
  );
  PERFORM economy_private.apply_ledger_entry(
    v_user_id, -5, 'spend', 'passport', 'reward_redemption', 'SPEND-PARTIAL',
    NULL, NULL, 'partial-spend', gen_random_uuid(), '{}'::jsonb
  );

  v_result := public.reverse_point_reference('shop', 'ORDER-PARTIAL', 'partial rollback test', gen_random_uuid());
  IF (v_result ->> 'code') <> 'NOT_ELIGIBLE' THEN
    RAISE EXCEPTION 'insufficient reversal did not fail: %', v_result;
  END IF;

  SELECT balance INTO v_balance FROM public.point_accounts WHERE user_id = v_user_id;
  SELECT count(*) INTO v_reversals
  FROM public.point_ledger
  WHERE reversal_of IN (
    SELECT id FROM public.point_ledger
    WHERE source_site = 'shop' AND reference_id = 'ORDER-PARTIAL' AND delta > 0
  );
  IF v_balance <> 5 OR v_reversals <> 0 THEN
    RAISE EXCEPTION 'reversal was partially committed: balance %, reversals %', v_balance, v_reversals;
  END IF;
END
$atomic_reversal_failure$;

DO $schema_assertions$
DECLARE
  v_balance BIGINT;
  v_ledger_count BIGINT;
BEGIN
  SELECT balance INTO v_balance FROM public.point_accounts
  WHERE user_id = '11111111-1111-1111-1111-111111111111';
  IF v_balance <> 6 THEN
    RAISE EXCEPTION 'unexpected final balance %, expected 6', v_balance;
  END IF;

  SELECT count(*) INTO v_ledger_count
  FROM public.point_ledger
  WHERE user_id = '11111111-1111-1111-1111-111111111111'
    AND reference_id = 'checkin-2026-07-15';
  IF v_ledger_count <> 1 THEN
    RAISE EXCEPTION '100 replays created % checkin ledger rows', v_ledger_count;
  END IF;

  IF EXISTS (SELECT 1 FROM public.v_economy_ledger_integrity WHERE mismatch <> 0) THEN
    RAISE EXCEPTION 'ledger integrity mismatch detected';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = '11111111-1111-1111-1111-111111111111'
      AND achievement_key = 'universe_starter'
  ) THEN
    RAISE EXCEPTION 'Universe Starter was not awarded';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_stamps
    WHERE user_id = '11111111-1111-1111-1111-111111111111'
      AND stamp_key = 'map_staff_visit'
  ) THEN
    RAISE EXCEPTION 'Map staff stamp was not awarded';
  END IF;

  IF has_table_privilege('authenticated', 'public.point_accounts', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated can INSERT point_accounts';
  END IF;
  IF has_table_privilege('authenticated', 'public.point_accounts', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated bypasses read rollout with direct point_accounts SELECT';
  END IF;
  IF has_schema_privilege('authenticated', 'economy_private', 'USAGE') THEN
    RAISE EXCEPTION 'authenticated has USAGE on economy_private';
  END IF;
  IF has_function_privilege('anon', 'public.economy_submit_event(jsonb,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute economy_submit_event';
  END IF;
  IF has_function_privilege('authenticated', 'public.reverse_point_reference(text,text,text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute reverse_point_reference';
  END IF;
  IF has_function_privilege(
    'authenticated',
    'public.reverse_point_reference(text,text,text,bigint,text,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated can execute partial reverse_point_reference';
  END IF;

  BEGIN
    UPDATE public.point_ledger
    SET metadata = metadata || '{"tampered":true}'::jsonb
    WHERE id = (SELECT id FROM public.point_ledger ORDER BY created_at LIMIT 1);
    RAISE EXCEPTION 'append-only ledger accepted UPDATE';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    NULL;
  END;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'economy_private')
      AND p.prosecdef
      AND (
        p.proconfig IS NULL
        OR NOT ('search_path=pg_catalog' = ANY(p.proconfig))
      )
      AND p.proname IN (
        'reject_mutation', 'rollout_enabled', 'apply_ledger_entry', 'submit_event',
        'economy_submit_event', 'economy_claim_pending', 'reverse_point_reference',
        'play_game', 'play_daily_gacha', 'spin_reward_wheel', 'redeem_reward_item',
        'rotate_reward_redemption_proof', 'fulfill_reward_redemption',
        'award_event_achievements', 'economy_get_wallet', 'issue_store_visit_proof',
        'claim_store_visit_proof'
      )
  ) THEN
    RAISE EXCEPTION 'Economy security-definer function lacks safe search_path';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (tablename = 'shop_orders' AND policyname = 'Anyone can view shop orders')
        OR (tablename = 'shop_order_items' AND policyname = 'Anyone can view shop order items')
        OR (tablename = 'special_eggs' AND policyname = 'Anyone can update claimed_count')
      )
  ) THEN
    RAISE EXCEPTION 'canonical adoption did not remove legacy public RLS policies';
  END IF;
END
$schema_assertions$;

SELECT 'foundation assertions passed' AS result;
