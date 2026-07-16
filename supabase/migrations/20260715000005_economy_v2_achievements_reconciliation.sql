-- Achievement evaluation, short-lived staff visit proofs, controlled reads,
-- and service-only reconciliation views.

CREATE OR REPLACE FUNCTION economy_private.award_event_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_rule public.economy_achievement_rules%ROWTYPE;
  v_required TEXT;
  v_complete BOOLEAN := TRUE;
BEGIN
  IF NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  FOR v_rule IN
    SELECT *
    FROM public.economy_achievement_rules
    WHERE is_active
      AND achievement_type = 'badge'
      AND event_type = NEW.event_type
  LOOP
    INSERT INTO public.user_achievements (
      user_id,
      achievement_key,
      achievement_version,
      source_event_id
    ) VALUES (
      NEW.actor_user_id,
      v_rule.achievement_key,
      v_rule.version,
      NEW.id
    )
    ON CONFLICT (user_id, achievement_key, achievement_version) DO NOTHING;
  END LOOP;

  FOR v_rule IN
    SELECT *
    FROM public.economy_achievement_rules
    WHERE is_active
      AND achievement_type = 'badge'
      AND event_type IS NULL
      AND cardinality(required_event_types) > 0
  LOOP
    v_complete := TRUE;
    FOREACH v_required IN ARRAY v_rule.required_event_types
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM public.economy_events e
        WHERE e.actor_user_id = NEW.actor_user_id
          AND e.event_type = v_required
          AND e.status = 'accepted'
      ) THEN
        v_complete := FALSE;
        EXIT;
      END IF;
    END LOOP;

    IF v_complete THEN
      INSERT INTO public.user_achievements (
        user_id,
        achievement_key,
        achievement_version,
        source_event_id
      ) VALUES (
        NEW.actor_user_id,
        v_rule.achievement_key,
        v_rule.version,
        NEW.id
      )
      ON CONFLICT (user_id, achievement_key, achievement_version) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END
$function$;

CREATE TRIGGER economy_events_award_achievements
  AFTER INSERT ON public.economy_events
  FOR EACH ROW EXECUTE FUNCTION economy_private.award_event_achievements();

CREATE OR REPLACE FUNCTION public.economy_get_wallet(
  p_source_site TEXT,
  p_history_limit INTEGER,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance BIGINT := 0;
  v_history JSONB := '[]'::jsonb;
BEGIN
  p_request_id := coalesce(p_request_id, gen_random_uuid());

  IF v_user_id IS NULL THEN
    RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
  END IF;

  IF NOT economy_private.rollout_enabled(btrim(coalesce(p_source_site, '')), 'read', v_user_id) THEN
    RETURN economy_private.response(FALSE, 'ROLLOUT_DISABLED', p_request_id);
  END IF;

  SELECT balance INTO v_balance
  FROM public.point_accounts
  WHERE user_id = v_user_id;

  SELECT coalesce(jsonb_agg(entry ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_history
  FROM (
    SELECT jsonb_build_object(
      'id', id,
      'delta', delta,
      'balance_after', balance_after,
      'entry_type', entry_type,
      'source_site', source_site,
      'reference_type', reference_type,
      'reference_id', reference_id,
      'created_at', created_at
    ) AS entry,
    created_at
    FROM public.point_ledger
    WHERE user_id = v_user_id
    ORDER BY created_at DESC
    LIMIT least(greatest(coalesce(p_history_limit, 20), 1), 100)
  ) history;

  RETURN economy_private.response(TRUE, 'OK', p_request_id,
    jsonb_build_object(
      'balance', coalesce(v_balance, 0),
      'history', v_history
    ));
END
$function$;

CREATE OR REPLACE FUNCTION public.issue_store_visit_proof(
  p_subject_user_id UUID,
  p_location_id TEXT,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_staff public.staff_members%ROWTYPE;
  v_proof public.store_visit_proofs%ROWTYPE;
  v_token_id TEXT;
  v_secret TEXT;
  v_credential TEXT;
BEGIN
  p_request_id := coalesce(p_request_id, gen_random_uuid());

  IF auth.uid() IS NULL THEN
    RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
  END IF;

  SELECT * INTO v_staff
  FROM public.staff_members
  WHERE user_id = auth.uid()
    AND is_active;

  IF NOT FOUND
     OR btrim(coalesce(p_location_id, '')) = ''
     OR (cardinality(v_staff.location_ids) > 0 AND NOT p_location_id = ANY(v_staff.location_ids)) THEN
    RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
  END IF;

  v_token_id := 'VIS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  v_secret := encode(extensions.gen_random_bytes(24), 'hex');
  v_credential := v_token_id || '.' || v_secret;

  INSERT INTO public.store_visit_proofs (
    token_id,
    token_hash,
    subject_user_id,
    staff_user_id,
    location_id,
    expires_at,
    request_id
  ) VALUES (
    v_token_id,
    encode(extensions.digest(v_credential, 'sha256'), 'hex'),
    p_subject_user_id,
    v_staff.user_id,
    btrim(p_location_id),
    now() + interval '5 minutes',
    p_request_id
  )
  RETURNING * INTO v_proof;

  INSERT INTO public.staff_audit_log (
    staff_user_id,
    action,
    target_type,
    target_id,
    request_id,
    details
  ) VALUES (
    v_staff.user_id,
    'store_visit.proof_issued',
    'store_visit_proof',
    v_proof.id::text,
    p_request_id,
    jsonb_build_object('location_id', v_proof.location_id, 'subject_bound', p_subject_user_id IS NOT NULL)
  );

  RETURN economy_private.response(TRUE, 'OK', p_request_id,
    jsonb_build_object(
      'proof_id', v_proof.id,
      'credential', v_credential,
      'expires_at', v_proof.expires_at,
      'location_id', v_proof.location_id
    ));
END
$function$;

CREATE OR REPLACE FUNCTION public.claim_store_visit_proof(
  p_proof TEXT,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_token_id TEXT;
  v_hash TEXT;
  v_proof public.store_visit_proofs%ROWTYPE;
  v_event_result JSONB;
  v_event_pk UUID;
BEGIN
  p_request_id := coalesce(p_request_id, gen_random_uuid());

  IF v_user_id IS NULL THEN
    RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
  END IF;

  IF NOT economy_private.rollout_enabled('map', 'write', v_user_id) THEN
    RETURN economy_private.response(FALSE, 'ROLLOUT_DISABLED', p_request_id);
  END IF;

  v_token_id := split_part(btrim(coalesce(p_proof, '')), '.', 1);
  v_hash := encode(extensions.digest(btrim(coalesce(p_proof, '')), 'sha256'), 'hex');

  IF length(v_token_id) < 10 OR position('.' IN coalesce(p_proof, '')) = 0 THEN
    RETURN economy_private.response(FALSE, 'INVALID_PROOF', p_request_id);
  END IF;

  SELECT * INTO v_proof
  FROM public.store_visit_proofs
  WHERE token_id = v_token_id
  FOR UPDATE;

  IF NOT FOUND OR v_proof.token_hash IS DISTINCT FROM v_hash THEN
    RETURN economy_private.response(FALSE, 'INVALID_PROOF', p_request_id);
  ELSIF v_proof.used_at IS NOT NULL THEN
    RETURN economy_private.response(FALSE, 'ALREADY_PROCESSED', p_request_id,
      jsonb_build_object('used_by', v_proof.used_by, 'used_at', v_proof.used_at));
  ELSIF v_proof.expires_at <= now() THEN
    RETURN economy_private.response(FALSE, 'EXPIRED', p_request_id);
  ELSIF v_proof.subject_user_id IS NOT NULL AND v_proof.subject_user_id <> v_user_id THEN
    RETURN economy_private.response(FALSE, 'INVALID_PROOF', p_request_id);
  END IF;

  v_event_result := economy_private.submit_event(
    jsonb_build_object(
      'event_id', gen_random_uuid(),
      'event_type', 'map.visit_confirmed',
      'occurred_at', now(),
      'source_site', 'map',
      'actor_user_id', v_user_id,
      'reference_id', v_proof.id::text,
      'evidence', jsonb_build_object(
        'proof_id', v_proof.id,
        'location_id', v_proof.location_id,
        'staff_user_id', v_proof.staff_user_id
      ),
      'schema_version', 1
    ),
    p_request_id,
    TRUE
  );

  IF NOT coalesce((v_event_result ->> 'ok')::boolean, FALSE)
     AND v_event_result ->> 'code' <> 'ALREADY_PROCESSED' THEN
    RETURN v_event_result;
  END IF;

  v_event_pk := nullif(v_event_result #>> '{data,event_id}', '')::uuid;

  UPDATE public.store_visit_proofs
  SET used_at = now(),
      used_by = v_user_id
  WHERE id = v_proof.id
  RETURNING * INTO v_proof;

  INSERT INTO public.user_stamps (
    user_id,
    stamp_key,
    stamp_version,
    location_id,
    proof_id
  ) VALUES (
    v_user_id,
    'map_staff_visit',
    1,
    v_proof.location_id,
    v_proof.id
  )
  ON CONFLICT (user_id, stamp_key, stamp_version) DO NOTHING;

  INSERT INTO public.staff_audit_log (
    staff_user_id,
    action,
    target_type,
    target_id,
    request_id,
    details
  ) VALUES (
    v_proof.staff_user_id,
    'store_visit.proof_claimed',
    'store_visit_proof',
    v_proof.id::text,
    p_request_id,
    jsonb_build_object('claimed_by', v_user_id, 'economy_event_id', v_event_pk)
  );

  RETURN economy_private.response(TRUE, 'OK', p_request_id,
    jsonb_build_object(
      'stamp_key', 'map_staff_visit',
      'location_id', v_proof.location_id,
      'awarded_at', v_proof.used_at,
      'event_id', v_event_pk
    ));
END
$function$;

CREATE OR REPLACE VIEW public.v_economy_ledger_integrity
WITH (security_invoker = true)
AS
SELECT
  a.user_id,
  a.balance AS account_balance,
  coalesce(sum(l.delta), 0)::bigint AS ledger_balance,
  a.balance - coalesce(sum(l.delta), 0)::bigint AS mismatch
FROM public.point_accounts a
LEFT JOIN public.point_ledger l ON l.user_id = a.user_id
GROUP BY a.user_id, a.balance;

CREATE OR REPLACE VIEW public.v_economy_legacy_reconciliation
WITH (security_invoker = true)
AS
SELECT
  u.user_id,
  u.legacy_identified_delta,
  coalesce(sum(l.delta), 0)::bigint AS economy_delta,
  u.legacy_identified_delta - coalesce(sum(l.delta), 0)::bigint AS mismatch
FROM (
  SELECT user_id, sum(points)::bigint AS legacy_identified_delta
  FROM public.point_transactions
  WHERE user_id IS NOT NULL
  GROUP BY user_id
) u
LEFT JOIN public.point_ledger l ON l.user_id = u.user_id
GROUP BY u.user_id, u.legacy_identified_delta;

CREATE OR REPLACE VIEW public.v_economy_rollout_health
WITH (security_invoker = true)
AS
SELECT
  c.source_site,
  c.read_enabled,
  c.shadow_write_enabled,
  c.write_enabled,
  c.redeem_enabled,
  c.rollout_percentage,
  coalesce(e.events_72h, 0) AS events_72h,
  coalesce(s.mismatches_72h, 0) AS mismatches_72h
FROM public.economy_rollout_config c
LEFT JOIN (
  SELECT source_site, count(*) AS events_72h
  FROM public.economy_events
  WHERE created_at >= now() - interval '72 hours'
  GROUP BY source_site
) e ON e.source_site = c.source_site
LEFT JOIN (
  SELECT source_site, count(*) FILTER (WHERE mismatch) AS mismatches_72h
  FROM public.economy_shadow_comparisons
  WHERE compared_at >= now() - interval '72 hours'
  GROUP BY source_site
) s ON s.source_site = c.source_site;

REVOKE ALL ON public.v_economy_ledger_integrity,
  public.v_economy_legacy_reconciliation,
  public.v_economy_rollout_health
FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_economy_ledger_integrity,
  public.v_economy_legacy_reconciliation,
  public.v_economy_rollout_health
TO service_role;

REVOKE ALL ON FUNCTION public.economy_get_wallet(TEXT, INTEGER, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.economy_get_wallet(TEXT, INTEGER, UUID)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.issue_store_visit_proof(UUID, TEXT, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_store_visit_proof(UUID, TEXT, UUID)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.claim_store_visit_proof(TEXT, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_store_visit_proof(TEXT, UUID)
  TO authenticated, service_role;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA economy_private
  FROM PUBLIC, anon, authenticated;

COMMENT ON VIEW public.v_economy_legacy_reconciliation IS
  'Identified legacy records only. Anonymous/localStorage points are intentionally excluded.';
