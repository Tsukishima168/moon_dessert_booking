-- Economy v2 event and ledger runtime.

CREATE OR REPLACE FUNCTION economy_private.response(
  p_ok BOOLEAN,
  p_code TEXT,
  p_request_id UUID,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'ok', p_ok,
    'code', p_code,
    'request_id', p_request_id,
    'data', coalesce(p_data, '{}'::jsonb)
  );
$function$;

CREATE OR REPLACE FUNCTION economy_private.is_service_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $function$
  SELECT coalesce(auth.role(), '') = 'service_role';
$function$;

CREATE OR REPLACE FUNCTION economy_private.rollout_enabled(
  p_source_site TEXT,
  p_capability TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_config public.economy_rollout_config%ROWTYPE;
  v_flag BOOLEAN;
  v_bucket INTEGER;
BEGIN
  SELECT * INTO v_config
  FROM public.economy_rollout_config
  WHERE source_site = p_source_site;

  IF NOT FOUND OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  v_flag := CASE p_capability
    WHEN 'read' THEN v_config.read_enabled
    WHEN 'shadow' THEN v_config.shadow_write_enabled
    WHEN 'write' THEN v_config.write_enabled
    WHEN 'redeem' THEN v_config.redeem_enabled
    ELSE FALSE
  END;

  IF NOT v_flag THEN
    RETURN FALSE;
  END IF;

  IF p_user_id = ANY(v_config.allowlist) THEN
    RETURN TRUE;
  END IF;

  IF v_config.rollout_percentage <= 0 THEN
    RETURN FALSE;
  ELSIF v_config.rollout_percentage >= 100 THEN
    RETURN TRUE;
  END IF;

  v_bucket := mod(abs(hashtextextended(p_user_id::text || '|' || p_source_site, 0)::numeric), 100)::integer;
  RETURN v_bucket < v_config.rollout_percentage;
END
$function$;

CREATE OR REPLACE FUNCTION economy_private.period_key(
  p_occurred_at TIMESTAMPTZ,
  p_period_seconds INTEGER,
  p_period_timezone TEXT
)
RETURNS BIGINT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $function$
  SELECT CASE
    WHEN p_period_seconds > 0
      THEN floor(
        extract(epoch FROM timezone('UTC', timezone(p_period_timezone, p_occurred_at)))
        / p_period_seconds
      )::bigint
    ELSE NULL
  END;
$function$;

CREATE OR REPLACE FUNCTION economy_private.make_idempotency_key(
  p_user_id UUID,
  p_source_site TEXT,
  p_event_type TEXT,
  p_reference_id TEXT,
  p_period_seconds INTEGER,
  p_period_timezone TEXT,
  p_occurred_at TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $function$
  SELECT encode(
    extensions.digest(
      concat_ws(
        '|',
        p_user_id::text,
        p_source_site,
        p_event_type,
        p_reference_id,
        CASE
          WHEN p_period_seconds > 0
            THEN economy_private.period_key(
              p_occurred_at,
              p_period_seconds,
              p_period_timezone
            )::text
          ELSE 'reference'
        END
      ),
      'sha256'
    ),
    'hex'
  );
$function$;

CREATE OR REPLACE FUNCTION economy_private.apply_ledger_entry(
  p_user_id UUID,
  p_delta BIGINT,
  p_entry_type TEXT,
  p_source_site TEXT,
  p_reference_type TEXT,
  p_reference_id TEXT,
  p_policy_key TEXT,
  p_policy_version INTEGER,
  p_idempotency_key TEXT,
  p_request_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_reversal_of UUID DEFAULT NULL
)
RETURNS public.point_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_balance BIGINT;
  v_new_balance BIGINT;
  v_entry public.point_ledger%ROWTYPE;
BEGIN
  IF p_delta = 0 THEN
    RAISE EXCEPTION 'ZERO_LEDGER_DELTA' USING ERRCODE = 'P0001';
  END IF;

  IF (p_entry_type IN ('earn', 'grant') AND p_delta < 0)
     OR (p_entry_type = 'spend' AND p_delta > 0)
     OR ((p_entry_type = 'reversal') <> (p_reversal_of IS NOT NULL)) THEN
    RAISE EXCEPTION 'INVALID_LEDGER_DIRECTION' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  INSERT INTO public.point_accounts (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_entry
  FROM public.point_ledger
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN v_entry;
  END IF;

  SELECT balance INTO v_balance
  FROM public.point_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_new_balance := v_balance + p_delta;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_POINTS' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.point_accounts
  SET balance = v_new_balance,
      lifetime_earned = lifetime_earned + CASE
        WHEN p_entry_type IN ('earn', 'grant') THEN greatest(p_delta, 0)
        ELSE 0
      END,
      lifetime_spent = lifetime_spent + CASE
        WHEN p_entry_type = 'spend' THEN greatest(-p_delta, 0)
        ELSE 0
      END,
      version = version + 1,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.point_ledger (
    user_id,
    delta,
    balance_after,
    entry_type,
    source_site,
    reference_type,
    reference_id,
    policy_key,
    policy_version,
    idempotency_key,
    reversal_of,
    request_id,
    metadata,
    created_by
  ) VALUES (
    p_user_id,
    p_delta,
    v_new_balance,
    p_entry_type,
    p_source_site,
    p_reference_type,
    p_reference_id,
    p_policy_key,
    p_policy_version,
    p_idempotency_key,
    p_reversal_of,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb),
    auth.uid()
  )
  RETURNING * INTO v_entry;

  RETURN v_entry;
END
$function$;

CREATE OR REPLACE FUNCTION economy_private.submit_event(
  p_event JSONB,
  p_request_id UUID,
  p_internal BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_event_id UUID;
  v_event_type TEXT;
  v_occurred_at TIMESTAMPTZ;
  v_source_site TEXT;
  v_requested_actor UUID;
  v_actor UUID;
  v_reference_id TEXT;
  v_evidence JSONB;
  v_schema_version INTEGER;
  v_policy public.economy_event_policies%ROWTYPE;
  v_effective_at TIMESTAMPTZ;
  v_period_key BIGINT;
  v_idempotency_key TEXT;
  v_status TEXT;
  v_existing public.economy_events%ROWTYPE;
  v_inserted public.economy_events%ROWTYPE;
  v_ledger public.point_ledger%ROWTYPE;
  v_period_count INTEGER;
  v_balance BIGINT;
  v_policy_points INTEGER;
  v_order_amount NUMERIC;
BEGIN
  p_request_id := coalesce(p_request_id, gen_random_uuid());

  IF p_event IS NULL OR jsonb_typeof(p_event) <> 'object' THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id);
  END IF;

  IF p_event ?| ARRAY['amount', 'points', 'reward_points', 'points_delta'] THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'client_points_forbidden'));
  END IF;

  BEGIN
    v_event_id := (p_event ->> 'event_id')::uuid;
    v_event_type := btrim(p_event ->> 'event_type');
    v_occurred_at := (p_event ->> 'occurred_at')::timestamptz;
    v_source_site := btrim(p_event ->> 'source_site');
    v_requested_actor := (p_event ->> 'actor_user_id')::uuid;
    v_reference_id := btrim(p_event ->> 'reference_id');
    v_evidence := coalesce(p_event -> 'evidence', '{}'::jsonb);
    v_schema_version := (p_event ->> 'schema_version')::integer;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'invalid_event_contract'));
  END;

  IF v_event_id IS NULL
     OR v_event_type IS NULL OR v_event_type = ''
     OR v_occurred_at IS NULL
     OR v_source_site IS NULL OR v_source_site = ''
     OR v_requested_actor IS NULL
     OR v_reference_id IS NULL OR v_reference_id = ''
     OR v_schema_version <> 1
     OR jsonb_typeof(v_evidence) <> 'object'
     OR octet_length(v_evidence::text) > 16384 THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'invalid_event_contract'));
  END IF;

  IF economy_private.is_service_role() THEN
    v_actor := v_requested_actor;
  ELSE
    v_actor := auth.uid();
    IF v_actor IS NULL OR v_actor <> v_requested_actor THEN
      RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
    END IF;
  END IF;

  IF v_occurred_at > now() + interval '5 minutes'
     OR v_occurred_at < now() - interval '30 days' THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'occurred_at_out_of_range'));
  END IF;

  v_effective_at := CASE
    WHEN economy_private.is_service_role() OR p_internal THEN v_occurred_at
    ELSE now()
  END;

  SELECT * INTO v_policy
  FROM public.economy_event_policies
  WHERE source_site = v_source_site
    AND event_type = v_event_type
    AND is_active
    AND active_from <= v_effective_at
    AND (active_until IS NULL OR active_until > v_effective_at)
  ORDER BY version DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'policy_not_found'));
  END IF;

  IF v_policy.submission_mode = 'service_role'
     AND NOT economy_private.is_service_role()
     AND NOT p_internal THEN
    RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
  ELSIF v_policy.submission_mode = 'internal' AND NOT p_internal THEN
    RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
  END IF;

  v_policy_points := v_policy.reward_points;
  IF v_policy.eligibility ->> 'reward_formula' = 'shop_completed_order_floor_100' THEN
    SELECT o.final_price
    INTO v_order_amount
    FROM public.orders o
    WHERE o.order_id = v_reference_id
      AND o.user_id = v_actor
      AND o.status = 'completed';

    IF NOT FOUND OR v_order_amount IS NULL OR v_order_amount < 0 THEN
      RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
        jsonb_build_object('reason', 'completed_order_not_found'));
    END IF;

    IF v_order_amount > 214748364700::numeric THEN
      RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
        jsonb_build_object('reason', 'order_amount_out_of_range'));
    END IF;

    v_policy_points := floor(v_order_amount / 100)::integer;
  END IF;

  IF economy_private.rollout_enabled(v_source_site, 'write', v_actor) THEN
    v_status := 'accepted';
  ELSIF economy_private.rollout_enabled(v_source_site, 'shadow', v_actor) THEN
    v_status := 'shadow';
  ELSE
    RETURN economy_private.response(FALSE, 'ROLLOUT_DISABLED', p_request_id);
  END IF;

  v_idempotency_key := economy_private.make_idempotency_key(
    v_actor,
    v_source_site,
    v_event_type,
    v_reference_id,
    v_policy.period_seconds,
    v_policy.period_timezone,
    v_effective_at
  );

  v_period_key := economy_private.period_key(
    v_effective_at,
    v_policy.period_seconds,
    v_policy.period_timezone
  );

  PERFORM pg_advisory_xact_lock(hashtextextended(
    v_actor::text || '|' || v_policy.policy_key || '|' ||
    CASE
      WHEN v_policy.eligibility ->> 'limit_scope' = 'lifetime'
        THEN 'lifetime'
      WHEN v_policy.period_seconds > 0
        THEN v_period_key::text
      ELSE v_reference_id
    END,
    0
  ));

  SELECT * INTO v_existing
  FROM public.economy_events
  WHERE idempotency_key = v_idempotency_key;

  IF FOUND THEN
    RETURN economy_private.response(FALSE, 'ALREADY_PROCESSED', p_request_id,
      jsonb_build_object(
        'event_id', v_existing.id,
        'status', v_existing.status,
        'awarded_points', v_existing.awarded_points
      ));
  END IF;

  IF v_policy.eligibility ->> 'limit_scope' = 'lifetime' THEN
    SELECT count(*) INTO v_period_count
    FROM public.economy_events
    WHERE actor_user_id = v_actor
      AND policy_key = v_policy.policy_key
      AND policy_version = v_policy.version;

    IF v_period_count >= v_policy.max_per_period THEN
      RETURN economy_private.response(FALSE, 'LIMIT_REACHED', p_request_id);
    END IF;
  ELSIF v_policy.period_seconds > 0 THEN
    SELECT count(*) INTO v_period_count
    FROM public.economy_events
    WHERE actor_user_id = v_actor
      AND policy_key = v_policy.policy_key
      AND policy_version = v_policy.version
      AND period_key = v_period_key;

    IF v_period_count >= v_policy.max_per_period THEN
      RETURN economy_private.response(FALSE, 'LIMIT_REACHED', p_request_id);
    END IF;
  END IF;

  INSERT INTO public.point_accounts (user_id)
  VALUES (v_actor)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.economy_events (
    event_id,
    event_type,
    occurred_at,
    source_site,
    actor_user_id,
    reference_id,
    evidence,
    schema_version,
    policy_key,
    policy_version,
    policy_points,
    awarded_points,
    period_key,
    status,
    idempotency_key,
    request_id
  ) VALUES (
    v_event_id,
    v_event_type,
    v_occurred_at,
    v_source_site,
    v_actor,
    v_reference_id,
    v_evidence,
    v_schema_version,
    v_policy.policy_key,
    v_policy.version,
    v_policy_points,
    CASE WHEN v_status = 'accepted' THEN v_policy_points ELSE 0 END,
    v_period_key,
    v_status,
    v_idempotency_key,
    p_request_id
  )
  RETURNING * INTO v_inserted;

  IF v_status = 'accepted' AND v_policy_points > 0 THEN
    v_ledger := economy_private.apply_ledger_entry(
      v_actor,
      v_policy_points,
      'earn',
      v_source_site,
      v_event_type,
      v_reference_id,
      v_policy.policy_key,
      v_policy.version,
      'event:' || v_idempotency_key,
      p_request_id,
      jsonb_build_object('economy_event_id', v_inserted.id)
    );
    v_balance := v_ledger.balance_after;
  ELSE
    SELECT balance INTO v_balance
    FROM public.point_accounts
    WHERE user_id = v_actor;
  END IF;

  RETURN economy_private.response(TRUE, 'OK', p_request_id,
    jsonb_build_object(
      'event_id', v_inserted.id,
      'status', v_inserted.status,
      'awarded_points', v_inserted.awarded_points,
      'balance', coalesce(v_balance, 0)
    ));
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO v_existing
  FROM public.economy_events
  WHERE idempotency_key = v_idempotency_key OR event_id = v_event_id
  ORDER BY created_at
  LIMIT 1;

  IF v_existing.id IS NULL
     OR v_existing.actor_user_id <> v_actor
     OR v_existing.source_site <> v_source_site
     OR v_existing.event_type <> v_event_type
     OR v_existing.reference_id <> v_reference_id THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'event_identity_conflict'));
  END IF;

  RETURN economy_private.response(FALSE, 'ALREADY_PROCESSED', p_request_id,
    jsonb_build_object(
      'event_id', v_existing.id,
      'status', v_existing.status,
      'awarded_points', v_existing.awarded_points
    ));
END
$function$;

CREATE OR REPLACE FUNCTION public.economy_submit_event(
  p_event JSONB,
  p_request_id UUID DEFAULT gen_random_uuid()
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT economy_private.submit_event(
    p_event,
    coalesce(p_request_id, gen_random_uuid()),
    FALSE
  );
$function$;

CREATE OR REPLACE FUNCTION public.economy_issue_mbti_attempt(
  p_attempt_id UUID,
  p_quiz_version TEXT,
  p_subject_user_id UUID,
  p_expires_at TIMESTAMPTZ,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_config public.economy_rollout_config%ROWTYPE;
  v_secret TEXT;
  v_proof TEXT;
  v_not_before TIMESTAMPTZ := now() + interval '10 seconds';
  v_response_data JSONB;
  v_replay public.economy_operation_replays%ROWTYPE;
  v_fingerprint TEXT;
BEGIN
  p_request_id := coalesce(p_request_id, gen_random_uuid());
  p_quiz_version := btrim(coalesce(p_quiz_version, ''));

  IF NOT economy_private.is_service_role() THEN
    RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
  END IF;

  IF p_attempt_id IS NULL
     OR p_quiz_version NOT IN ('v1-40', 'v2-tw-40')
     OR p_expires_at IS NULL
     OR p_expires_at <= v_not_before + interval '30 seconds'
     OR p_expires_at > now() + interval '4 hours'
     OR (p_subject_user_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM auth.users WHERE id = p_subject_user_id
     )) THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'invalid_attempt_contract'));
  END IF;

  SELECT * INTO v_config
  FROM public.economy_rollout_config
  WHERE source_site = 'kiwimu';

  IF NOT FOUND
     OR NOT v_config.write_enabled
     OR (
       p_subject_user_id IS NULL
       AND v_config.rollout_percentage < 100
     )
     OR (
       p_subject_user_id IS NOT NULL
       AND NOT economy_private.rollout_enabled('kiwimu', 'write', p_subject_user_id)
     ) THEN
    RETURN economy_private.response(FALSE, 'ROLLOUT_DISABLED', p_request_id);
  END IF;

  v_fingerprint := encode(extensions.digest(
    p_attempt_id::text || '|' || p_quiz_version || '|' ||
    coalesce(p_subject_user_id::text, '') || '|' || p_expires_at::text,
    'sha256'
  ), 'hex');

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'service:kiwimu|mbti.attempt.issue|' || p_request_id::text,
    0
  ));

  DELETE FROM public.economy_operation_replays
  WHERE expires_at <= now();

  SELECT * INTO v_replay
  FROM public.economy_operation_replays
  WHERE scope_key = 'service:kiwimu'
    AND operation_key = 'mbti.attempt.issue'
    AND request_id = p_request_id;

  IF FOUND THEN
    IF v_replay.request_fingerprint IS DISTINCT FROM v_fingerprint THEN
      RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
        jsonb_build_object('reason', 'request_reuse_mismatch'));
    END IF;
    RETURN economy_private.response(TRUE, 'OK', p_request_id, v_replay.response_data);
  END IF;

  IF EXISTS (SELECT 1 FROM public.economy_mbti_attempts WHERE attempt_id = p_attempt_id) THEN
    RETURN economy_private.response(FALSE, 'ALREADY_PROCESSED', p_request_id);
  END IF;

  v_secret := encode(extensions.gen_random_bytes(32), 'hex');
  v_proof := p_attempt_id::text || '.' || v_secret;
  v_response_data := jsonb_build_object(
    'attempt_proof', v_proof,
    'not_before', v_not_before,
    'expires_at', p_expires_at
  );

  INSERT INTO public.economy_mbti_attempts (
    attempt_id,
    quiz_version,
    subject_user_id,
    proof_hash,
    not_before,
    expires_at,
    issue_request_id
  ) VALUES (
    p_attempt_id,
    p_quiz_version,
    p_subject_user_id,
    encode(extensions.digest(v_proof, 'sha256'), 'hex'),
    v_not_before,
    p_expires_at,
    p_request_id
  );

  INSERT INTO public.economy_operation_replays (
    scope_key, operation_key, request_id, request_fingerprint, response_data, expires_at
  ) VALUES (
    'service:kiwimu',
    'mbti.attempt.issue',
    p_request_id,
    v_fingerprint,
    v_response_data,
    p_expires_at
  );

  RETURN economy_private.response(TRUE, 'OK', p_request_id, v_response_data);
END
$function$;

CREATE OR REPLACE FUNCTION public.economy_complete_mbti_attempt(
  p_attempt_proof TEXT,
  p_completion_id UUID,
  p_quiz_version TEXT,
  p_result_type TEXT,
  p_variant TEXT,
  p_answers_sha256 TEXT,
  p_actor_user_id UUID,
  p_pending_expires_at TIMESTAMPTZ,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_attempt_id UUID;
  v_attempt public.economy_mbti_attempts%ROWTYPE;
  v_config public.economy_rollout_config%ROWTYPE;
  v_proof_hash TEXT;
  v_event_payload JSONB;
  v_result JSONB;
  v_claim_id UUID;
  v_claim_expires_at TIMESTAMPTZ;
BEGIN
  p_request_id := coalesce(p_request_id, gen_random_uuid());
  p_attempt_proof := btrim(coalesce(p_attempt_proof, ''));
  p_quiz_version := btrim(coalesce(p_quiz_version, ''));
  p_result_type := upper(btrim(coalesce(p_result_type, '')));
  p_variant := upper(btrim(coalesce(p_variant, '')));
  p_answers_sha256 := lower(btrim(coalesce(p_answers_sha256, '')));

  IF NOT economy_private.is_service_role() THEN
    RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
  END IF;

  BEGIN
    v_attempt_id := split_part(p_attempt_proof, '.', 1)::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN economy_private.response(FALSE, 'INVALID_PROOF', p_request_id);
  END;

  IF p_completion_id IS NULL
     OR position('.' IN p_attempt_proof) = 0
     OR length(split_part(p_attempt_proof, '.', 2)) <> 64
     OR split_part(p_attempt_proof, '.', 2) !~ '^[0-9a-fA-F]{64}$'
     OR p_quiz_version NOT IN ('v1-40', 'v2-tw-40')
     OR p_result_type !~ '^[EI][SN][TF][JP]$'
     OR p_variant !~ '^[AT]$'
     OR p_answers_sha256 !~ '^[0-9a-f]{64}$' THEN
    RETURN economy_private.response(FALSE, 'INVALID_PROOF', p_request_id);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'mbti-completion|' || p_completion_id::text,
    0
  ));

  v_proof_hash := encode(extensions.digest(p_attempt_proof, 'sha256'), 'hex');
  SELECT * INTO v_attempt
  FROM public.economy_mbti_attempts
  WHERE attempt_id = v_attempt_id
  FOR UPDATE;

  IF NOT FOUND OR v_attempt.proof_hash IS DISTINCT FROM v_proof_hash THEN
    RETURN economy_private.response(FALSE, 'INVALID_PROOF', p_request_id);
  END IF;

  IF v_attempt.consumed_at IS NOT NULL THEN
    IF v_attempt.completion_id = p_completion_id THEN
      RETURN economy_private.response(
        coalesce((v_attempt.completion_response ->> 'ok')::boolean, FALSE),
        v_attempt.completion_response ->> 'code',
        p_request_id,
        coalesce(v_attempt.completion_response -> 'data', '{}'::jsonb)
      );
    END IF;
    RETURN economy_private.response(FALSE, 'ALREADY_PROCESSED', p_request_id);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.economy_mbti_attempts
    WHERE completion_id = p_completion_id
      AND attempt_id <> v_attempt_id
  ) THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'completion_identity_conflict'));
  END IF;

  IF v_attempt.expires_at <= now() THEN
    RETURN economy_private.response(FALSE, 'EXPIRED', p_request_id);
  ELSIF v_attempt.not_before > now() THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'attempt_not_ready', 'not_before', v_attempt.not_before));
  ELSIF v_attempt.quiz_version <> p_quiz_version THEN
    RETURN economy_private.response(FALSE, 'INVALID_PROOF', p_request_id);
  ELSIF v_attempt.subject_user_id IS NOT NULL
        AND v_attempt.subject_user_id IS DISTINCT FROM p_actor_user_id THEN
    RETURN economy_private.response(FALSE, 'INVALID_PROOF', p_request_id);
  ELSIF p_actor_user_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_actor_user_id) THEN
    RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
  END IF;

  SELECT * INTO v_config
  FROM public.economy_rollout_config
  WHERE source_site = 'kiwimu';

  IF NOT FOUND
     OR NOT v_config.write_enabled
     OR (p_actor_user_id IS NULL AND v_config.rollout_percentage < 100)
     OR (
       p_actor_user_id IS NOT NULL
       AND NOT economy_private.rollout_enabled('kiwimu', 'write', p_actor_user_id)
     ) THEN
    RETURN economy_private.response(FALSE, 'ROLLOUT_DISABLED', p_request_id);
  END IF;

  v_event_payload := jsonb_build_object(
    'event_id', p_completion_id,
    'event_type', 'mbti.completed',
    'occurred_at', now(),
    'source_site', 'kiwimu',
    'reference_id', 'mbti:' || p_completion_id::text,
    'evidence', jsonb_build_object(
      'attempt_id', v_attempt.attempt_id,
      'quiz_version', p_quiz_version,
      'result_type', p_result_type,
      'variant', p_variant,
      'answers_sha256', p_answers_sha256
    ),
    'schema_version', 1
  );

  IF p_actor_user_id IS NULL THEN
    IF p_pending_expires_at IS NULL
       OR p_pending_expires_at <= now() + interval '5 minutes'
       OR p_pending_expires_at > now() + interval '8 days' THEN
      RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
        jsonb_build_object('reason', 'invalid_pending_expiry'));
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.economy_event_policies
      WHERE source_site = 'kiwimu'
        AND event_type = 'mbti.completed'
        AND is_active
        AND eligibility @> '{"pending_claim_allowed":true}'::jsonb
        AND active_from <= now()
        AND (active_until IS NULL OR active_until > now())
    ) THEN
      RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
        jsonb_build_object('reason', 'pending_claim_not_allowed'));
    END IF;

    v_claim_id := gen_random_uuid();
    v_claim_expires_at := p_pending_expires_at;
    INSERT INTO public.pending_activity_claims (
      id,
      source_site,
      event_payload,
      evidence_hash,
      expires_at
    ) VALUES (
      v_claim_id,
      'kiwimu',
      v_event_payload,
      encode(extensions.digest(
        p_completion_id::text || '|' || p_answers_sha256,
        'sha256'
      ), 'hex'),
      v_claim_expires_at
    );

    v_result := economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id,
      jsonb_build_object('claim_id', v_claim_id, 'expires_at', v_claim_expires_at));
  ELSE
    v_event_payload := jsonb_set(
      v_event_payload,
      '{actor_user_id}',
      to_jsonb(p_actor_user_id::text),
      TRUE
    );
    v_result := economy_private.submit_event(v_event_payload, p_request_id, FALSE);
  END IF;

  UPDATE public.economy_mbti_attempts
  SET consumed_at = now(),
      completion_id = p_completion_id,
      completion_response = v_result
  WHERE attempt_id = v_attempt.attempt_id;

  RETURN v_result;
END
$function$;

CREATE OR REPLACE FUNCTION public.economy_claim_pending(
  p_claim_id UUID,
  p_request_id UUID DEFAULT gen_random_uuid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_claim public.pending_activity_claims%ROWTYPE;
  v_policy public.economy_event_policies%ROWTYPE;
  v_result JSONB;
  v_event_pk UUID;
  v_actor UUID;
  v_payload JSONB;
  v_payload_source TEXT;
  v_payload_event_type TEXT;
  v_occurred_at TIMESTAMPTZ;
BEGIN
  p_request_id := coalesce(p_request_id, gen_random_uuid());
  v_actor := auth.uid();

  IF v_actor IS NULL THEN
    RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
  END IF;

  SELECT * INTO v_claim
  FROM public.pending_activity_claims
  WHERE id = p_claim_id
    AND (user_id IS NULL OR user_id = v_actor)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id);
  END IF;

  IF v_claim.claimed_at IS NOT NULL THEN
    RETURN economy_private.response(FALSE, 'ALREADY_PROCESSED', p_request_id,
      jsonb_build_object('event_id', v_claim.claimed_event_id));
  END IF;

  IF v_claim.expires_at <= now() THEN
    RETURN economy_private.response(FALSE, 'EXPIRED', p_request_id);
  END IF;

  BEGIN
    v_payload_source := btrim(v_claim.event_payload ->> 'source_site');
    v_payload_event_type := btrim(v_claim.event_payload ->> 'event_type');
    v_occurred_at := (v_claim.event_payload ->> 'occurred_at')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'invalid_pending_claim'));
  END;

  IF v_payload_source IS NULL
     OR v_payload_source = ''
     OR v_payload_source <> v_claim.source_site
     OR v_payload_event_type IS NULL
     OR v_payload_event_type = ''
     OR v_occurred_at IS NULL THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'invalid_pending_claim'));
  END IF;

  SELECT * INTO v_policy
  FROM public.economy_event_policies
  WHERE source_site = v_payload_source
    AND event_type = v_payload_event_type
    AND is_active
    AND active_from <= v_occurred_at
    AND (active_until IS NULL OR active_until > v_occurred_at)
    AND eligibility @> '{"pending_claim_allowed":true}'::jsonb
  ORDER BY version DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'pending_claim_not_allowed'));
  END IF;

  v_payload := jsonb_set(
    v_claim.event_payload,
    '{actor_user_id}',
    to_jsonb(v_actor::text),
    TRUE
  );
  v_result := economy_private.submit_event(v_payload, p_request_id, TRUE);

  IF coalesce((v_result ->> 'ok')::boolean, FALSE)
     OR v_result ->> 'code' = 'ALREADY_PROCESSED' THEN
    v_event_pk := nullif(v_result #>> '{data,event_id}', '')::uuid;
    UPDATE public.pending_activity_claims
    SET user_id = v_actor,
        claimed_at = now(),
        claimed_event_id = v_event_pk
    WHERE id = v_claim.id;
  END IF;

  RETURN v_result;
END
$function$;

CREATE OR REPLACE FUNCTION public.reverse_point_reference(
  p_source_site TEXT,
  p_reference_id TEXT,
  p_reversal_reference_id TEXT,
  p_reverse_points BIGINT,
  p_reason TEXT,
  p_request_id UUID DEFAULT gen_random_uuid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_user_id UUID;
  v_user_count INTEGER;
  v_original public.point_ledger%ROWTYPE;
  v_reversal public.point_ledger%ROWTYPE;
  v_original_available BIGINT;
  v_available_points BIGINT;
  v_requested_points BIGINT;
  v_remaining_points BIGINT;
  v_piece BIGINT;
  v_balance BIGINT;
  v_already_reversed BIGINT;
  v_reversed_points BIGINT := 0;
BEGIN
  p_request_id := coalesce(p_request_id, gen_random_uuid());

  IF NOT economy_private.is_service_role() THEN
    RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
  END IF;

  p_source_site := btrim(coalesce(p_source_site, ''));
  p_reference_id := btrim(coalesce(p_reference_id, ''));
  p_reversal_reference_id := btrim(coalesce(p_reversal_reference_id, ''));
  p_reason := btrim(coalesce(p_reason, ''));

  IF p_source_site = ''
     OR p_reference_id = ''
     OR p_reversal_reference_id = ''
     OR octet_length(p_reference_id) > 512
     OR octet_length(p_reversal_reference_id) > 512
     OR octet_length(p_reason) > 2048
     OR (p_reverse_points IS NOT NULL AND p_reverse_points <= 0) THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'invalid_reversal_contract'));
  END IF;

  SELECT (array_agg(DISTINCT user_id))[1], count(DISTINCT user_id)
  INTO v_user_id, v_user_count
  FROM public.point_ledger
  WHERE source_site = p_source_site
    AND reference_id = p_reference_id
    AND delta > 0
    AND reversal_of IS NULL;

  IF v_user_count = 0 THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id);
  ELSIF v_user_count <> 1 THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'ambiguous_reference_owner'));
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  -- Lock every original entry before calculating outstanding reversible points.
  PERFORM 1
  FROM public.point_ledger
  WHERE source_site = p_source_site
    AND reference_id = p_reference_id
    AND delta > 0
    AND reversal_of IS NULL
  FOR UPDATE;

  SELECT coalesce(sum(-delta), 0)::bigint
  INTO v_already_reversed
  FROM public.point_ledger
  WHERE entry_type = 'reversal'
    AND source_site = p_source_site
    AND reference_id = p_reference_id
    AND delta < 0
    AND metadata ->> 'reversal_reference_id' = p_reversal_reference_id;

  IF v_already_reversed > 0 THEN
    RETURN economy_private.response(FALSE, 'ALREADY_PROCESSED', p_request_id,
      jsonb_build_object(
        'reversal_reference_id', p_reversal_reference_id,
        'reversed_points', v_already_reversed
      ));
  END IF;

  SELECT coalesce(sum(greatest(
    original.delta + coalesce((
      SELECT sum(reversal.delta)
      FROM public.point_ledger reversal
      WHERE reversal.reversal_of = original.id
    ), 0),
    0
  )), 0)::bigint
  INTO v_available_points
  FROM public.point_ledger original
  WHERE original.source_site = p_source_site
    AND original.reference_id = p_reference_id
    AND original.delta > 0
    AND original.reversal_of IS NULL;

  IF v_available_points <= 0 THEN
    RETURN economy_private.response(FALSE, 'ALREADY_PROCESSED', p_request_id,
      jsonb_build_object('reversed_points', 0));
  END IF;

  v_requested_points := coalesce(p_reverse_points, v_available_points);
  IF v_requested_points > v_available_points THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object(
        'reason', 'reversal_exceeds_available',
        'available_points', v_available_points
      ));
  END IF;

  SELECT balance INTO v_balance
  FROM public.point_accounts
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_balance < v_requested_points THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object(
        'reason', 'reversal_would_create_negative_balance',
        'available_balance', coalesce(v_balance, 0)
      ));
  END IF;

  v_remaining_points := v_requested_points;

  BEGIN
    FOR v_original IN
      SELECT l.*
      FROM public.point_ledger l
      WHERE l.source_site = p_source_site
        AND l.reference_id = p_reference_id
        AND l.delta > 0
        AND l.reversal_of IS NULL
      ORDER BY l.created_at, l.id
      FOR UPDATE
    LOOP
      SELECT greatest(
        v_original.delta + coalesce(sum(r.delta), 0),
        0
      )::bigint
      INTO v_original_available
      FROM public.point_ledger r
      WHERE r.reversal_of = v_original.id;

      IF v_original_available <= 0 THEN
        CONTINUE;
      END IF;

      v_piece := least(v_remaining_points, v_original_available);

      v_reversal := economy_private.apply_ledger_entry(
        v_original.user_id,
        -v_piece,
        'reversal',
        v_original.source_site,
        'reversal',
        v_original.reference_id,
        v_original.policy_key,
        v_original.policy_version,
        'reversal:' || encode(extensions.digest(
          v_original.id::text || '|' || p_reversal_reference_id,
          'sha256'
        ), 'hex'),
        p_request_id,
        jsonb_build_object(
          'reason', p_reason,
          'original_ledger_id', v_original.id,
          'reversal_reference_id', p_reversal_reference_id
        ),
        v_original.id
      );
      v_reversed_points := v_reversed_points + abs(v_reversal.delta);
      v_remaining_points := v_remaining_points - abs(v_reversal.delta);

      EXIT WHEN v_remaining_points = 0;
    END LOOP;

    IF v_remaining_points <> 0 THEN
      RAISE EXCEPTION 'REVERSAL_INVARIANT' USING ERRCODE = 'P0002';
    END IF;
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'reversal_would_create_negative_balance'));
  WHEN SQLSTATE 'P0002' THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'reversal_invariant_failed'));
  END;

  RETURN economy_private.response(TRUE, 'OK', p_request_id,
    jsonb_build_object(
      'reversal_reference_id', p_reversal_reference_id,
      'reversed_points', v_reversed_points,
      'remaining_reversible_points', v_available_points - v_reversed_points
    ));
END
$function$;

CREATE OR REPLACE FUNCTION public.reverse_point_reference(
  p_source_site TEXT,
  p_reference_id TEXT,
  p_reason TEXT,
  p_request_id UUID DEFAULT gen_random_uuid()
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT public.reverse_point_reference(
    p_source_site,
    p_reference_id,
    'full:' || encode(extensions.digest(
      btrim(coalesce(p_source_site, '')) || '|' || btrim(coalesce(p_reference_id, '')),
      'sha256'
    ), 'hex'),
    NULL,
    p_reason,
    coalesce(p_request_id, gen_random_uuid())
  );
$function$;

REVOKE ALL ON FUNCTION public.economy_submit_event(JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.economy_submit_event(JSONB, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.economy_claim_pending(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.economy_claim_pending(UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.economy_issue_mbti_attempt(UUID, TEXT, UUID, TIMESTAMPTZ, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.economy_issue_mbti_attempt(UUID, TEXT, UUID, TIMESTAMPTZ, UUID)
  TO service_role;

REVOKE ALL ON FUNCTION public.economy_complete_mbti_attempt(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ, UUID
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.economy_complete_mbti_attempt(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ, UUID
) TO service_role;

REVOKE ALL ON FUNCTION public.reverse_point_reference(TEXT, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_point_reference(TEXT, TEXT, TEXT, UUID)
  TO service_role;

REVOKE ALL ON FUNCTION public.reverse_point_reference(TEXT, TEXT, TEXT, BIGINT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_point_reference(TEXT, TEXT, TEXT, BIGINT, TEXT, UUID)
  TO service_role;

COMMENT ON FUNCTION public.economy_submit_event(JSONB, UUID) IS
  'EconomyEventV1 ingestion. Reward amounts are selected only from versioned server policy.';
COMMENT ON FUNCTION public.reverse_point_reference(TEXT, TEXT, TEXT, UUID) IS
  'Service-role-only full append-only reversal by source/reference.';
COMMENT ON FUNCTION public.reverse_point_reference(TEXT, TEXT, TEXT, BIGINT, TEXT, UUID) IS
  'Service-role-only exact partial reversal, idempotent by external reversal reference.';
