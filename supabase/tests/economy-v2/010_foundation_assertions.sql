\set ON_ERROR_STOP on

INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'member@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'staff@example.test'),
  ('55555555-5555-5555-5555-555555555555', 'pending-claim@example.test'),
  ('66666666-6666-6666-6666-666666666666', 'multi-redeem@example.test');
INSERT INTO public.profiles (id) VALUES
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('55555555-5555-5555-5555-555555555555'),
  ('66666666-6666-6666-6666-666666666666');
INSERT INTO public.staff_members (user_id, role, location_ids)
VALUES ('22222222-2222-2222-2222-222222222222', 'staff', ARRAY['annan-store']);
INSERT INTO public.orders (order_id, user_id, total_price, final_price, status)
VALUES
  ('ORDER-TEST-1', '11111111-1111-1111-1111-111111111111', 500, 500, 'completed'),
  ('ORDER-TEST-SMALL', '11111111-1111-1111-1111-111111111111', 99, 99, 'completed'),
  ('ORDER-TEST-PENDING', '11111111-1111-1111-1111-111111111111', 500, 500, 'pending');
INSERT INTO public.mbti_claims (code, mbti_type, variant)
VALUES ('legacy-test-code', 'INTJ', 'A');

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

DO $legacy_redeem_request_upgrade$
DECLARE
  v_result JSONB;
  v_rows INTEGER;
  v_index_definition TEXT;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', false);

  v_result := public.redeem_reward_item(
    'legacy-draft-reward',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee77'
  );
  SELECT count(*) INTO v_rows
  FROM public.reward_redemptions
  WHERE user_id = '77777777-7777-7777-7777-777777777777'
    AND reward_id = 'legacy-draft-reward';
  SELECT pg_get_indexdef(indexrelid) INTO v_index_definition
  FROM pg_index
  WHERE indexrelid = 'public.reward_redemptions_request_idx'::regclass;

  IF (v_result ->> 'code') <> 'ALREADY_PROCESSED'
     OR v_rows <> 1
     OR v_index_definition NOT LIKE '%(user_id, reward_id, redeem_request_id)%' THEN
    RAISE EXCEPTION 'legacy redeem request upgrade is unsafe: %, rows %, index %',
      v_result, v_rows, v_index_definition;
  END IF;
END
$legacy_redeem_request_upgrade$;

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

DO $gacha_catalog_default_off$
DECLARE
  v_seeded_prizes INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM public.economy_game_configs WHERE is_enabled)
     OR (SELECT cost_points FROM public.economy_game_configs WHERE game_mode = 'daily_gacha') <> 0
     OR (SELECT cost_points FROM public.economy_game_configs WHERE game_mode = 'reward_wheel') <> 30 THEN
    RAISE EXCEPTION 'canonical Gacha configs are not populated and default-off';
  END IF;

  SELECT count(*) INTO v_seeded_prizes
  FROM public.economy_gacha_prizes
  WHERE is_active;
  IF v_seeded_prizes <> 12 THEN
    RAISE EXCEPTION 'canonical Gacha prize catalog expected 12 active rows, got %', v_seeded_prizes;
  END IF;
END
$gacha_catalog_default_off$;

UPDATE public.economy_gacha_prizes
SET is_active = FALSE
WHERE game_mode = 'daily_gacha';

INSERT INTO public.economy_gacha_prizes
  (game_mode, prize_code, label, weight, points_delta, is_active)
VALUES ('daily_gacha', 'TEST-5', '測試 5 點', 1, 5, TRUE)
ON CONFLICT (game_mode, prize_code) DO UPDATE
SET weight = EXCLUDED.weight,
    points_delta = EXCLUDED.points_delta,
    is_active = TRUE;
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
  IF v_first #>> '{data,balance}' IS NULL
     OR v_second #>> '{data,balance}' IS NULL
     OR v_first #>> '{data,balance}' <> v_second #>> '{data,balance}'
     OR v_second #> '{data,event}' = '{}'::jsonb THEN
    RAISE EXCEPTION 'gacha replay omitted canonical balance/event data: %, %', v_first, v_second;
  END IF;
END
$gacha$;

DO $mbti_attempt_contract$
DECLARE
  v_bound_attempt_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  v_bound_completion_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  v_bound_issue_request UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee11';
  v_bound_expires_at TIMESTAMPTZ := now() + interval '2 hours';
  v_issue JSONB;
  v_issue_replay JSONB;
  v_issue_mismatch JSONB;
  v_not_ready JSONB;
  v_forged JSONB;
  v_wrong_actor JSONB;
  v_complete JSONB;
  v_complete_replay JSONB;
  v_reused JSONB;
  v_proof TEXT;
  v_replay_request UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee12';
  v_anon_attempt_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
  v_anon_completion_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2';
  v_anon_expires_at TIMESTAMPTZ := now() + interval '2 hours';
  v_pending_expires_at TIMESTAMPTZ := now() + interval '7 days';
  v_anon_issue JSONB;
  v_anon_complete JSONB;
  v_anon_replay JSONB;
  v_claim JSONB;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', false);

  v_issue := public.economy_issue_mbti_attempt(
    v_bound_attempt_id,
    'v2-tw-40',
    '11111111-1111-1111-1111-111111111111',
    v_bound_expires_at,
    v_bound_issue_request
  );
  v_issue_replay := public.economy_issue_mbti_attempt(
    v_bound_attempt_id,
    'v2-tw-40',
    '11111111-1111-1111-1111-111111111111',
    v_bound_expires_at,
    v_bound_issue_request
  );
  v_issue_mismatch := public.economy_issue_mbti_attempt(
    v_bound_attempt_id,
    'v1-40',
    '11111111-1111-1111-1111-111111111111',
    v_bound_expires_at,
    v_bound_issue_request
  );

  IF (v_issue ->> 'code') <> 'OK'
     OR (v_issue_replay ->> 'code') <> 'OK'
     OR v_issue #>> '{data,attempt_proof}' <> v_issue_replay #>> '{data,attempt_proof}'
     OR (v_issue_mismatch ->> 'code') <> 'NOT_ELIGIBLE' THEN
    RAISE EXCEPTION 'MBTI attempt issuance is not request-idempotent: %, %, %',
      v_issue, v_issue_replay, v_issue_mismatch;
  END IF;

  v_proof := v_issue #>> '{data,attempt_proof}';
  v_not_ready := public.economy_complete_mbti_attempt(
    v_proof,
    v_bound_completion_id,
    'v2-tw-40',
    'INTJ',
    'A',
    repeat('a', 64),
    '11111111-1111-1111-1111-111111111111',
    now() + interval '7 days',
    gen_random_uuid()
  );
  IF (v_not_ready ->> 'code') <> 'NOT_ELIGIBLE'
     OR v_not_ready #>> '{data,reason}' <> 'attempt_not_ready' THEN
    RAISE EXCEPTION 'MBTI not-before proof gate failed: %', v_not_ready;
  END IF;

  UPDATE public.economy_mbti_attempts
  SET not_before = now() - interval '1 second'
  WHERE attempt_id = v_bound_attempt_id;

  v_forged := public.economy_complete_mbti_attempt(
    v_proof || '0', v_bound_completion_id, 'v2-tw-40', 'INTJ', 'A', repeat('a', 64),
    '11111111-1111-1111-1111-111111111111', now() + interval '7 days', gen_random_uuid()
  );
  v_wrong_actor := public.economy_complete_mbti_attempt(
    v_proof, v_bound_completion_id, 'v2-tw-40', 'INTJ', 'A', repeat('a', 64),
    '22222222-2222-2222-2222-222222222222', now() + interval '7 days', gen_random_uuid()
  );
  IF (v_forged ->> 'code') <> 'INVALID_PROOF'
     OR (v_wrong_actor ->> 'code') <> 'INVALID_PROOF' THEN
    RAISE EXCEPTION 'MBTI forged/bound proof gate failed: %, %', v_forged, v_wrong_actor;
  END IF;

  v_complete := public.economy_complete_mbti_attempt(
    v_proof, v_bound_completion_id, 'v2-tw-40', 'INTJ', 'A', repeat('a', 64),
    '11111111-1111-1111-1111-111111111111', now() + interval '7 days', gen_random_uuid()
  );
  v_complete_replay := public.economy_complete_mbti_attempt(
    v_proof, v_bound_completion_id, 'v2-tw-40', 'INTJ', 'A', repeat('a', 64),
    '11111111-1111-1111-1111-111111111111', now() + interval '7 days', v_replay_request
  );
  v_reused := public.economy_complete_mbti_attempt(
    v_proof, gen_random_uuid(), 'v2-tw-40', 'INTJ', 'A', repeat('a', 64),
    '11111111-1111-1111-1111-111111111111', now() + interval '7 days', gen_random_uuid()
  );
  IF (v_complete ->> 'code') <> 'OK'
     OR (v_complete_replay ->> 'code') <> 'OK'
     OR (v_complete_replay ->> 'request_id')::uuid <> v_replay_request
     OR v_complete #> '{data}' <> v_complete_replay #> '{data}'
     OR (v_reused ->> 'code') <> 'ALREADY_PROCESSED' THEN
    RAISE EXCEPTION 'MBTI completion/replay contract failed: %, %, %',
      v_complete, v_complete_replay, v_reused;
  END IF;

  v_anon_issue := public.economy_issue_mbti_attempt(
    v_anon_attempt_id,
    'v2-tw-40',
    NULL,
    v_anon_expires_at,
    gen_random_uuid()
  );
  UPDATE public.economy_mbti_attempts
  SET not_before = now() - interval '1 second'
  WHERE attempt_id = v_anon_attempt_id;

  v_anon_complete := public.economy_complete_mbti_attempt(
    v_anon_issue #>> '{data,attempt_proof}',
    v_anon_completion_id,
    'v2-tw-40',
    'ENFP',
    'T',
    repeat('b', 64),
    NULL,
    v_pending_expires_at,
    gen_random_uuid()
  );
  v_anon_replay := public.economy_complete_mbti_attempt(
    v_anon_issue #>> '{data,attempt_proof}',
    v_anon_completion_id,
    'v2-tw-40',
    'ENFP',
    'T',
    repeat('b', 64),
    NULL,
    v_pending_expires_at,
    gen_random_uuid()
  );
  IF (v_anon_issue ->> 'code') <> 'OK'
     OR (v_anon_complete ->> 'code') <> 'AUTH_REQUIRED'
     OR (v_anon_replay ->> 'code') <> 'AUTH_REQUIRED'
     OR v_anon_complete #>> '{data,claim_id}' <> v_anon_replay #>> '{data,claim_id}' THEN
    RAISE EXCEPTION 'anonymous MBTI pending claim contract failed: %, %, %',
      v_anon_issue, v_anon_complete, v_anon_replay;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', false);
  v_claim := public.economy_claim_pending(
    (v_anon_complete #>> '{data,claim_id}')::uuid,
    gen_random_uuid()
  );
  IF (v_claim ->> 'code') <> 'OK' THEN
    RAISE EXCEPTION 'generated MBTI pending claim failed: %', v_claim;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
END
$mbti_attempt_contract$;

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
  v_result := public.economy_submit_event(jsonb_build_object(
    'event_id', gen_random_uuid(), 'event_type', 'order.completed', 'occurred_at', now(),
    'source_site', 'shop', 'actor_user_id', '11111111-1111-1111-1111-111111111111',
    'reference_id', 'ORDER-TEST-1', 'evidence', '{}'::jsonb, 'schema_version', 1
  ), gen_random_uuid());
  IF (v_result ->> 'code') <> 'OK' THEN
    RAISE EXCEPTION 'journey event failed: %', v_result;
  END IF;

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

DO $pending_claims$
DECLARE
  v_claim_id UUID := 'cccccccc-cccc-cccc-cccc-ccccccccccc1';
  v_forbidden_id UUID := 'cccccccc-cccc-cccc-cccc-ccccccccccc2';
  v_expired_id UUID := 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
  v_result JSONB;
  v_event_id UUID;
  v_balance BIGINT;
BEGIN
  INSERT INTO public.pending_activity_claims (
    id, source_site, event_payload, evidence_hash, expires_at
  ) VALUES (
    v_claim_id,
    'kiwimu',
    jsonb_build_object(
      'event_id', 'dddddddd-dddd-dddd-dddd-ddddddddddd1',
      'event_type', 'mbti.completed',
      'occurred_at', now(),
      'source_site', 'kiwimu',
      'reference_id', 'mbti-pending-claim-1',
      'evidence', jsonb_build_object('result_hash', 'test-result-hash'),
      'schema_version', 1
    ),
    'pending-evidence-unique-1',
    now() + interval '15 minutes'
  ), (
    v_forbidden_id,
    'shop',
    jsonb_build_object(
      'event_id', 'dddddddd-dddd-dddd-dddd-ddddddddddd2',
      'event_type', 'order.completed',
      'occurred_at', now(),
      'source_site', 'shop',
      'reference_id', 'ORDER-TEST-1',
      'evidence', '{}'::jsonb,
      'schema_version', 1
    ),
    'pending-evidence-unique-2',
    now() + interval '15 minutes'
  );

  INSERT INTO public.pending_activity_claims (
    id, source_site, event_payload, evidence_hash, created_at, expires_at
  ) VALUES (
    v_expired_id,
    'kiwimu',
    jsonb_build_object(
      'event_id', 'dddddddd-dddd-dddd-dddd-ddddddddddd3',
      'event_type', 'mbti.completed',
      'occurred_at', now() - interval '1 day',
      'source_site', 'kiwimu',
      'reference_id', 'mbti-expired-claim',
      'evidence', '{}'::jsonb,
      'schema_version', 1
    ),
    'pending-evidence-unique-3',
    now() - interval '2 days',
    now() - interval '1 day'
  );

  BEGIN
    INSERT INTO public.pending_activity_claims (
      source_site, event_payload, evidence_hash, expires_at
    ) VALUES (
      'kiwimu', '{}'::jsonb, 'pending-evidence-unique-1', now() + interval '15 minutes'
    );
    RAISE EXCEPTION 'duplicate pending evidence was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  PERFORM set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', false);
  v_result := public.economy_claim_pending(v_claim_id, gen_random_uuid());
  IF (v_result ->> 'code') <> 'OK' OR (v_result #>> '{data,awarded_points}')::integer <> 10 THEN
    RAISE EXCEPTION 'anonymous pending claim failed: %', v_result;
  END IF;

  SELECT claimed_event_id INTO v_event_id
  FROM public.pending_activity_claims
  WHERE id = v_claim_id
    AND user_id = '55555555-5555-5555-5555-555555555555'
    AND claimed_at IS NOT NULL;
  IF v_event_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.economy_events
    WHERE id = v_event_id
      AND actor_user_id = '55555555-5555-5555-5555-555555555555'
      AND event_type = 'mbti.completed'
      AND source_site = 'kiwimu'
  ) THEN
    RAISE EXCEPTION 'pending claim was not atomically bound to the authenticated member';
  END IF;

  SELECT balance INTO v_balance
  FROM public.point_accounts
  WHERE user_id = '55555555-5555-5555-5555-555555555555';
  IF v_balance <> 10 THEN
    RAISE EXCEPTION 'pending claim balance %, expected 10', v_balance;
  END IF;

  v_result := public.economy_claim_pending(v_claim_id, gen_random_uuid());
  IF (v_result ->> 'code') <> 'ALREADY_PROCESSED' THEN
    RAISE EXCEPTION 'same-member pending replay was not idempotent: %', v_result;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
  v_result := public.economy_claim_pending(v_claim_id, gen_random_uuid());
  IF (v_result ->> 'code') <> 'NOT_ELIGIBLE' THEN
    RAISE EXCEPTION 'cross-user pending replay leaked the claim: %', v_result;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', false);
  v_result := public.economy_claim_pending(v_forbidden_id, gen_random_uuid());
  IF (v_result ->> 'code') <> 'NOT_ELIGIBLE'
     OR v_result #>> '{data,reason}' <> 'pending_claim_not_allowed' THEN
    RAISE EXCEPTION 'unauthorized pending policy was accepted: %', v_result;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.pending_activity_claims
    WHERE id = v_forbidden_id AND (user_id IS NOT NULL OR claimed_at IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'rejected pending claim mutated ownership';
  END IF;

  v_result := public.economy_claim_pending(v_expired_id, gen_random_uuid());
  IF (v_result ->> 'code') <> 'EXPIRED' THEN
    RAISE EXCEPTION 'expired pending claim was not rejected: %', v_result;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
END
$pending_claims$;

DO $visit_proof$
DECLARE
  v_issue JSONB;
  v_issue_replay JSONB;
  v_issue_mismatch JSONB;
  v_issue_rollout_blocked JSONB;
  v_issue_disabled_replay JSONB;
  v_issue_after_claim JSONB;
  v_expiring_issue JSONB;
  v_expired_issue_replay JSONB;
  v_claim JSONB;
  v_claim_replay JSONB;
  v_proof TEXT;
  v_request_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1';
  v_blocked_request_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee0';
  v_expired_request_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2';
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
  UPDATE public.economy_rollout_config
  SET write_enabled = FALSE
  WHERE source_site = 'map';
  v_issue_rollout_blocked := public.issue_store_visit_proof(
    NULL,
    'annan-store',
    v_blocked_request_id
  );
  IF (v_issue_rollout_blocked ->> 'code') <> 'ROLLOUT_DISABLED'
     OR EXISTS (
       SELECT 1 FROM public.store_visit_proofs WHERE request_id = v_blocked_request_id
     ) THEN
    RAISE EXCEPTION 'visit proof issuance bypassed the rollout gate: %',
      v_issue_rollout_blocked;
  END IF;
  UPDATE public.economy_rollout_config
  SET write_enabled = TRUE
  WHERE source_site = 'map';

  v_issue := public.issue_store_visit_proof(NULL, 'annan-store', v_request_id);
  UPDATE public.economy_rollout_config
  SET write_enabled = FALSE
  WHERE source_site = 'map';
  v_issue_disabled_replay := public.issue_store_visit_proof(
    NULL,
    'annan-store',
    v_request_id
  );
  IF (v_issue_disabled_replay ->> 'code') <> 'ROLLOUT_DISABLED'
     OR (v_issue_disabled_replay -> 'data') ? 'credential' THEN
    RAISE EXCEPTION 'disabled rollout leaked a cached visit proof: %',
      v_issue_disabled_replay;
  END IF;
  UPDATE public.economy_rollout_config
  SET write_enabled = TRUE
  WHERE source_site = 'map';

  v_issue_replay := public.issue_store_visit_proof(NULL, 'annan-store', v_request_id);
  v_issue_mismatch := public.issue_store_visit_proof(
    '11111111-1111-1111-1111-111111111111',
    'annan-store',
    v_request_id
  );
  IF (v_issue ->> 'code') <> 'OK' THEN
    RAISE EXCEPTION 'visit proof issue failed: %', v_issue;
  END IF;
  IF (v_issue_replay ->> 'code') <> 'OK'
     OR v_issue #>> '{data,credential}' <> v_issue_replay #>> '{data,credential}'
     OR v_issue #>> '{data,proof_id}' <> v_issue_replay #>> '{data,proof_id}'
     OR (v_issue_mismatch ->> 'code') <> 'NOT_ELIGIBLE' THEN
    RAISE EXCEPTION 'visit proof issuance is not request-idempotent: %, %, %',
      v_issue, v_issue_replay, v_issue_mismatch;
  END IF;

  v_proof := v_issue #>> '{data,credential}';
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  v_claim := public.claim_store_visit_proof(v_proof, gen_random_uuid());
  v_claim_replay := public.claim_store_visit_proof(v_proof, gen_random_uuid());
  IF (v_claim ->> 'code') <> 'OK' OR (v_claim_replay ->> 'code') <> 'ALREADY_PROCESSED' THEN
    RAISE EXCEPTION 'visit proof claim/replay failed: %, %', v_claim, v_claim_replay;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
  v_issue_after_claim := public.issue_store_visit_proof(NULL, 'annan-store', v_request_id);
  IF (v_issue_after_claim ->> 'code') <> 'ALREADY_PROCESSED'
     OR (v_issue_after_claim -> 'data') ? 'credential' THEN
    RAISE EXCEPTION 'used proof credential leaked through issue replay: %',
      v_issue_after_claim;
  END IF;

  v_expiring_issue := public.issue_store_visit_proof(
    NULL,
    'annan-store',
    v_expired_request_id
  );
  IF (v_expiring_issue ->> 'code') <> 'OK' THEN
    RAISE EXCEPTION 'expiring visit proof setup failed: %', v_expiring_issue;
  END IF;
  UPDATE public.store_visit_proofs
  SET created_at = now() - interval '10 minutes',
      expires_at = now() - interval '5 minutes'
  WHERE request_id = v_expired_request_id;
  UPDATE public.economy_operation_replays
  SET created_at = now() - interval '10 minutes',
      expires_at = now() - interval '5 minutes'
  WHERE request_id = v_expired_request_id
    AND operation_key = 'store_visit.proof.issue';

  v_expired_issue_replay := public.issue_store_visit_proof(
    NULL,
    'annan-store',
    v_expired_request_id
  );
  IF (v_expired_issue_replay ->> 'code') <> 'EXPIRED'
     OR (v_expired_issue_replay -> 'data') ? 'credential'
     OR (
       SELECT count(*) FROM public.store_visit_proofs
       WHERE request_id = v_expired_request_id
     ) <> 1 THEN
    RAISE EXCEPTION 'expired issue request minted or leaked a replacement proof: %',
      v_expired_issue_replay;
  END IF;
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
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
  v_redeem_replay JSONB;
  v_rotate JSONB;
  v_rotate_replay JSONB;
  v_second_rotate JSONB;
  v_stale_rotate_replay JSONB;
  v_stale_redeem_replay JSONB;
  v_post_fulfill_rotate_replay JSONB;
  v_fulfill JSONB;
  v_repeat JSONB;
  v_credential TEXT;
  v_request_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2';
  v_rotate_request_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3';
  v_second_rotate_request_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee13';
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  v_redeem := public.redeem_reward_item('foundation-reward', v_request_id);
  v_redeem_replay := public.redeem_reward_item('foundation-reward', v_request_id);
  IF (v_redeem ->> 'code') <> 'OK' THEN
    RAISE EXCEPTION 'redemption failed: %', v_redeem;
  END IF;
  IF (v_redeem_replay ->> 'code') <> 'OK'
     OR v_redeem #>> '{data,credential}' <> v_redeem_replay #>> '{data,credential}' THEN
    RAISE EXCEPTION 'redemption request replay changed credential: %, %', v_redeem, v_redeem_replay;
  END IF;

  v_rotate := public.rotate_reward_redemption_proof(
    (v_redeem #>> '{data,redemption_id}')::uuid,
    v_rotate_request_id
  );
  v_rotate_replay := public.rotate_reward_redemption_proof(
    (v_redeem #>> '{data,redemption_id}')::uuid,
    v_rotate_request_id
  );
  IF (v_rotate ->> 'code') <> 'OK'
     OR (v_rotate_replay ->> 'code') <> 'OK'
     OR v_rotate #>> '{data,credential}' <> v_rotate_replay #>> '{data,credential}'
     OR v_rotate #>> '{data,credential}' = v_redeem #>> '{data,credential}' THEN
    RAISE EXCEPTION 'redemption proof rotation is not request-idempotent: %, %', v_rotate, v_rotate_replay;
  END IF;

  v_stale_redeem_replay := public.redeem_reward_item('foundation-reward', v_request_id);
  IF (v_stale_redeem_replay ->> 'code') <> 'ALREADY_PROCESSED'
     OR v_stale_redeem_replay #> '{data,credential}' IS NOT NULL THEN
    RAISE EXCEPTION 'redeem replay exposed a superseded credential: %', v_stale_redeem_replay;
  END IF;

  v_second_rotate := public.rotate_reward_redemption_proof(
    (v_redeem #>> '{data,redemption_id}')::uuid,
    v_second_rotate_request_id
  );
  v_stale_rotate_replay := public.rotate_reward_redemption_proof(
    (v_redeem #>> '{data,redemption_id}')::uuid,
    v_rotate_request_id
  );
  IF (v_second_rotate ->> 'code') <> 'OK'
     OR (v_stale_rotate_replay ->> 'code') <> 'ALREADY_PROCESSED'
     OR v_stale_rotate_replay #> '{data,credential}' IS NOT NULL THEN
    RAISE EXCEPTION 'rotation replay exposed a superseded credential: %, %',
      v_second_rotate, v_stale_rotate_replay;
  END IF;

  v_credential := v_second_rotate #>> '{data,credential}';
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
  v_fulfill := public.fulfill_reward_redemption(v_credential, gen_random_uuid());
  v_repeat := public.fulfill_reward_redemption(v_credential, gen_random_uuid());
  IF (v_fulfill ->> 'code') <> 'OK' OR (v_repeat ->> 'code') <> 'ALREADY_PROCESSED' THEN
    RAISE EXCEPTION 'fulfillment idempotency failed: %, %', v_fulfill, v_repeat;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  v_post_fulfill_rotate_replay := public.rotate_reward_redemption_proof(
    (v_redeem #>> '{data,redemption_id}')::uuid,
    v_second_rotate_request_id
  );
  IF (v_post_fulfill_rotate_replay ->> 'code') <> 'ALREADY_PROCESSED'
     OR v_post_fulfill_rotate_replay #> '{data,credential}' IS NOT NULL THEN
    RAISE EXCEPTION 'fulfilled redemption replay exposed a credential: %',
      v_post_fulfill_rotate_replay;
  END IF;
END
$redemption$;

INSERT INTO public.reward_items
  (reward_id, name, points_cost, category, stock_mode, redemption_period_seconds, max_per_period)
VALUES ('multi-reward', 'Multi Reward', 10, 'dessert', 'unlimited', 3600, 2);

DO $multi_redemption$
DECLARE
  v_first JSONB;
  v_first_replay JSONB;
  v_second JSONB;
  v_third JSONB;
  v_expired_cache_replay JSONB;
  v_balance_before_replay BIGINT;
  v_balance BIGINT;
  v_redemption_count INTEGER;
  v_first_request UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4';
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', false);
  PERFORM economy_private.apply_ledger_entry(
    '66666666-6666-6666-6666-666666666666',
    30,
    'grant',
    'passport',
    'test.grant',
    'multi-redemption-grant',
    NULL,
    NULL,
    'multi-redemption-grant',
    gen_random_uuid(),
    '{}'::jsonb
  );

  PERFORM set_config('request.jwt.claim.role', 'authenticated', false);
  PERFORM set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', false);
  v_first := public.redeem_reward_item('multi-reward', v_first_request);
  v_first_replay := public.redeem_reward_item('multi-reward', v_first_request);
  v_second := public.redeem_reward_item('multi-reward', gen_random_uuid());
  v_third := public.redeem_reward_item('multi-reward', gen_random_uuid());

  IF (v_first ->> 'code') <> 'OK'
     OR (v_first_replay ->> 'code') <> 'OK'
     OR v_first #>> '{data,credential}' <> v_first_replay #>> '{data,credential}'
     OR (v_second ->> 'code') <> 'OK'
     OR (v_third ->> 'code') <> 'LIMIT_REACHED' THEN
    RAISE EXCEPTION 'max_per_period > 1 redemption failed: %, %, %, %',
      v_first, v_first_replay, v_second, v_third;
  END IF;

  SELECT balance INTO v_balance_before_replay
  FROM public.point_accounts
  WHERE user_id = '66666666-6666-6666-6666-666666666666';

  DELETE FROM public.economy_operation_replays
  WHERE scope_key = 'user:66666666-6666-6666-6666-666666666666'
    AND operation_key = 'reward.redeem'
    AND request_id = v_first_request;

  v_expired_cache_replay := public.redeem_reward_item('multi-reward', v_first_request);
  SELECT balance INTO v_balance
  FROM public.point_accounts
  WHERE user_id = '66666666-6666-6666-6666-666666666666';
  SELECT count(*) INTO v_redemption_count
  FROM public.reward_redemptions
  WHERE user_id = '66666666-6666-6666-6666-666666666666'
    AND reward_id = 'multi-reward';

  IF (v_expired_cache_replay ->> 'code') <> 'ALREADY_PROCESSED'
     OR v_expired_cache_replay #> '{data,credential}' IS NOT NULL
     OR v_balance <> v_balance_before_replay
     OR v_redemption_count <> 2 THEN
    RAISE EXCEPTION 'expired replay cache allowed duplicate spend: %, balance % -> %, rows %',
      v_expired_cache_replay, v_balance_before_replay, v_balance, v_redemption_count;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
END
$multi_redemption$;

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
  IF NOT has_table_privilege('authenticated', 'public.reward_items', 'SELECT')
     OR NOT has_table_privilege('anon', 'public.reward_items', 'SELECT') THEN
    RAISE EXCEPTION 'reward catalog read grants are missing';
  END IF;
  IF has_table_privilege('anon', 'public.reward_redemptions', 'SELECT')
     OR has_table_privilege('authenticated', 'public.reward_items', 'INSERT,UPDATE,DELETE')
     OR has_table_privilege('authenticated', 'public.reward_redemptions', 'INSERT,UPDATE,DELETE')
     OR has_table_privilege('anon', 'public.mbti_claims', 'SELECT,INSERT,UPDATE,DELETE')
     OR has_table_privilege('authenticated', 'public.mbti_claims', 'SELECT,INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'legacy authority table boundary is broader than canonical';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('reward_items', 'reward_redemptions', 'mbti_claims')
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'legacy authority table RLS is not enabled';
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
  IF has_function_privilege(
       'authenticated',
       'public.economy_issue_mbti_attempt(uuid,text,uuid,timestamp with time zone,uuid)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'anon',
       'public.economy_complete_mbti_attempt(text,uuid,text,text,text,text,uuid,timestamp with time zone,uuid)',
       'EXECUTE'
     )
     OR NOT has_function_privilege(
       'service_role',
       'public.economy_complete_mbti_attempt(text,uuid,text,text,text,text,uuid,timestamp with time zone,uuid)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'MBTI proof RPC grants are not service-role-only';
  END IF;
  IF NOT has_function_privilege(
       'anon',
       'public.consume_mbti_claim(text)',
       'EXECUTE'
     )
     OR EXISTS (
       SELECT 1
       FROM information_schema.routine_privileges
       WHERE specific_schema = 'public'
         AND routine_name = 'consume_mbti_claim'
         AND grantee = 'PUBLIC'
         AND privilege_type = 'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'legacy MBTI bridge grant is not explicitly scoped';
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
        'consume_mbti_claim',
        'economy_submit_event', 'economy_claim_pending', 'economy_issue_mbti_attempt',
        'economy_complete_mbti_attempt', 'reverse_point_reference',
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
        OR tablename = 'mbti_claims'
      )
  ) THEN
    RAISE EXCEPTION 'canonical adoption did not remove legacy public RLS policies';
  END IF;
END
$schema_assertions$;

SELECT 'foundation assertions passed' AS result;
