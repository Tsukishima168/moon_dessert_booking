-- Atomic reward redemption and Supabase-Auth staff fulfillment.

CREATE OR REPLACE FUNCTION public.redeem_reward_item(
  p_reward_id TEXT,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_item public.reward_items%ROWTYPE;
  v_existing public.reward_redemptions%ROWTYPE;
  v_redemption public.reward_redemptions%ROWTYPE;
  v_balance BIGINT;
  v_idempotency_key TEXT;
  v_period_start TIMESTAMPTZ;
  v_period_count INTEGER;
  v_token_id TEXT;
  v_secret TEXT;
  v_proof TEXT;
  v_proof_hash TEXT;
  v_expires_at TIMESTAMPTZ;
  v_stock public.reward_stock_buckets%ROWTYPE;
BEGIN
  p_request_id := coalesce(p_request_id, gen_random_uuid());

  IF v_user_id IS NULL THEN
    RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
  END IF;

  IF NOT economy_private.rollout_enabled('passport', 'redeem', v_user_id) THEN
    RETURN economy_private.response(FALSE, 'ROLLOUT_DISABLED', p_request_id);
  END IF;

  SELECT * INTO v_item
  FROM public.reward_items
  WHERE reward_id = btrim(coalesce(p_reward_id, ''))
    AND is_active
    AND (available_from IS NULL OR available_from <= now())
    AND (available_until IS NULL OR available_until > now());

  IF NOT FOUND THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id);
  END IF;

  v_period_start := to_timestamp(
    floor(extract(epoch FROM now()) / v_item.redemption_period_seconds)
    * v_item.redemption_period_seconds
  );
  v_idempotency_key := encode(extensions.digest(
    v_user_id::text || '|redeem|' || v_item.reward_id || '|' ||
    floor(extract(epoch FROM now()) / v_item.redemption_period_seconds)::bigint::text,
    'sha256'
  ), 'hex');

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  SELECT * INTO v_existing
  FROM public.reward_redemptions
  WHERE idempotency_key = v_idempotency_key;

  IF FOUND THEN
    RETURN economy_private.response(FALSE, 'ALREADY_PROCESSED', p_request_id,
      jsonb_build_object(
        'redemption_id', v_existing.id,
        'reward_id', v_existing.reward_id,
        'status', v_existing.status,
        'issued_at', v_existing.issued_at,
        'expires_at', v_existing.expires_at
      ));
  END IF;

  SELECT count(*) INTO v_period_count
  FROM public.reward_redemptions
  WHERE user_id = v_user_id
    AND reward_id = v_item.reward_id
    AND issued_at >= v_period_start
    AND issued_at < v_period_start + make_interval(secs => v_item.redemption_period_seconds)
    AND status IN ('issued', 'fulfilled');

  IF v_period_count >= v_item.max_per_period THEN
    RETURN economy_private.response(FALSE, 'LIMIT_REACHED', p_request_id);
  END IF;

  INSERT INTO public.point_accounts (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_balance
  FROM public.point_accounts
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_balance < v_item.points_cost THEN
    RETURN economy_private.response(FALSE, 'INSUFFICIENT_POINTS', p_request_id,
      jsonb_build_object('balance', v_balance, 'points_cost', v_item.points_cost));
  END IF;

  IF v_item.stock_mode = 'finite' THEN
    SELECT * INTO v_stock
    FROM public.reward_stock_buckets
    WHERE reward_id = v_item.reward_id
      AND bucket_key = 'default'
    FOR UPDATE;

    IF NOT FOUND
       OR v_stock.quantity_reserved + v_stock.quantity_fulfilled >= v_stock.quantity_total THEN
      RETURN economy_private.response(FALSE, 'OUT_OF_STOCK', p_request_id);
    END IF;
  END IF;

  v_token_id := 'R2-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  v_secret := encode(extensions.gen_random_bytes(24), 'hex');
  v_proof := v_token_id || '.' || v_secret;
  v_proof_hash := encode(extensions.digest(v_proof, 'sha256'), 'hex');
  v_expires_at := least(
    now() + interval '30 days',
    coalesce(v_item.available_until, now() + interval '30 days')
  );

  INSERT INTO public.reward_redemptions (
    user_id,
    reward_id,
    reward_name,
    reward_category,
    points_cost,
    redemption_code,
    status,
    source,
    issued_at,
    expires_at,
    metadata,
    request_id,
    idempotency_key,
    catalog_version,
    stock_bucket_key,
    redemption_code_hash,
    credential_last4,
    reservation_expires_at
  ) VALUES (
    v_user_id,
    v_item.reward_id,
    v_item.name,
    v_item.category,
    v_item.points_cost,
    v_token_id,
    'issued',
    'passport',
    now(),
    v_expires_at,
    jsonb_build_object('redemption_method', v_item.redemption_method),
    p_request_id,
    v_idempotency_key,
    v_item.catalog_version,
    CASE WHEN v_item.stock_mode = 'finite' THEN 'default' ELSE NULL END,
    v_proof_hash,
    right(v_secret, 4),
    v_expires_at
  )
  RETURNING * INTO v_redemption;

  IF v_item.stock_mode = 'finite' THEN
    UPDATE public.reward_stock_buckets
    SET quantity_reserved = quantity_reserved + 1,
        updated_at = now()
    WHERE reward_id = v_item.reward_id
      AND bucket_key = 'default';
  END IF;

  PERFORM economy_private.apply_ledger_entry(
    v_user_id,
    -v_item.points_cost,
    'spend',
    'passport',
    'reward_redemption',
    v_redemption.id::text,
    NULL,
    NULL,
    'redemption:' || v_idempotency_key,
    p_request_id,
    jsonb_build_object(
      'reward_id', v_item.reward_id,
      'catalog_version', v_item.catalog_version
    )
  );

  RETURN economy_private.response(TRUE, 'OK', p_request_id,
    jsonb_build_object(
      'redemption_id', v_redemption.id,
      'reward_id', v_redemption.reward_id,
      'reward_name', v_redemption.reward_name,
      'points_cost', v_redemption.points_cost,
      'status', v_redemption.status,
      'credential', v_proof,
      'expires_at', v_redemption.expires_at,
      'balance', v_balance - v_item.points_cost
    ));
END
$function$;

CREATE OR REPLACE FUNCTION public.rotate_reward_redemption_proof(
  p_redemption_id UUID,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_redemption public.reward_redemptions%ROWTYPE;
  v_secret TEXT;
  v_proof TEXT;
BEGIN
  p_request_id := coalesce(p_request_id, gen_random_uuid());

  IF v_user_id IS NULL THEN
    RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
  END IF;

  SELECT * INTO v_redemption
  FROM public.reward_redemptions
  WHERE id = p_redemption_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id);
  ELSIF v_redemption.status <> 'issued' THEN
    RETURN economy_private.response(FALSE, 'ALREADY_PROCESSED', p_request_id,
      jsonb_build_object('status', v_redemption.status));
  ELSIF v_redemption.expires_at <= now() THEN
    RETURN economy_private.response(FALSE, 'EXPIRED', p_request_id);
  END IF;

  v_secret := encode(extensions.gen_random_bytes(24), 'hex');
  v_proof := v_redemption.redemption_code || '.' || v_secret;

  UPDATE public.reward_redemptions
  SET redemption_code_hash = encode(extensions.digest(v_proof, 'sha256'), 'hex'),
      credential_last4 = right(v_secret, 4),
      request_id = p_request_id
  WHERE id = v_redemption.id;

  RETURN economy_private.response(TRUE, 'OK', p_request_id,
    jsonb_build_object(
      'redemption_id', v_redemption.id,
      'credential', v_proof,
      'expires_at', v_redemption.expires_at
    ));
END
$function$;

CREATE OR REPLACE FUNCTION public.fulfill_reward_redemption(
  p_redemption_code TEXT,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_staff public.staff_members%ROWTYPE;
  v_redemption public.reward_redemptions%ROWTYPE;
  v_token_id TEXT;
  v_proof_hash TEXT;
BEGIN
  p_request_id := coalesce(p_request_id, gen_random_uuid());

  IF auth.uid() IS NULL THEN
    RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
  END IF;

  SELECT * INTO v_staff
  FROM public.staff_members
  WHERE user_id = auth.uid()
    AND is_active;

  IF NOT FOUND THEN
    RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
  END IF;

  v_token_id := split_part(btrim(coalesce(p_redemption_code, '')), '.', 1);
  v_proof_hash := encode(extensions.digest(btrim(coalesce(p_redemption_code, '')), 'sha256'), 'hex');

  IF length(v_token_id) < 10 OR position('.' IN coalesce(p_redemption_code, '')) = 0 THEN
    RETURN economy_private.response(FALSE, 'INVALID_PROOF', p_request_id);
  END IF;

  SELECT * INTO v_redemption
  FROM public.reward_redemptions
  WHERE redemption_code = v_token_id
  FOR UPDATE;

  IF NOT FOUND OR v_redemption.redemption_code_hash IS DISTINCT FROM v_proof_hash THEN
    RETURN economy_private.response(FALSE, 'INVALID_PROOF', p_request_id);
  END IF;

  IF v_redemption.status = 'fulfilled' THEN
    RETURN economy_private.response(FALSE, 'ALREADY_PROCESSED', p_request_id,
      jsonb_build_object(
        'redemption_id', v_redemption.id,
        'fulfilled_by', v_redemption.fulfilled_by_user_id,
        'fulfilled_at', v_redemption.fulfilled_at
      ));
  ELSIF v_redemption.status <> 'issued' THEN
    RETURN economy_private.response(FALSE, 'ALREADY_PROCESSED', p_request_id,
      jsonb_build_object('status', v_redemption.status));
  ELSIF v_redemption.expires_at <= now() THEN
    UPDATE public.reward_redemptions
    SET status = 'expired'
    WHERE id = v_redemption.id;

    IF v_redemption.stock_bucket_key IS NOT NULL THEN
      UPDATE public.reward_stock_buckets
      SET quantity_reserved = greatest(quantity_reserved - 1, 0),
          quantity_released = quantity_released + 1,
          updated_at = now()
      WHERE reward_id = v_redemption.reward_id
        AND bucket_key = v_redemption.stock_bucket_key;
    END IF;

    RETURN economy_private.response(FALSE, 'EXPIRED', p_request_id);
  END IF;

  UPDATE public.reward_redemptions
  SET status = 'fulfilled',
      fulfilled_at = now(),
      fulfilled_by = v_staff.user_id::text,
      fulfilled_by_user_id = v_staff.user_id
  WHERE id = v_redemption.id
  RETURNING * INTO v_redemption;

  IF v_redemption.stock_bucket_key IS NOT NULL THEN
    UPDATE public.reward_stock_buckets
    SET quantity_reserved = greatest(quantity_reserved - 1, 0),
        quantity_fulfilled = quantity_fulfilled + 1,
        updated_at = now()
    WHERE reward_id = v_redemption.reward_id
      AND bucket_key = v_redemption.stock_bucket_key;
  END IF;

  INSERT INTO public.staff_audit_log (
    staff_user_id,
    action,
    target_type,
    target_id,
    request_id,
    details
  ) VALUES (
    v_staff.user_id,
    'reward.fulfilled',
    'reward_redemption',
    v_redemption.id::text,
    p_request_id,
    jsonb_build_object('reward_id', v_redemption.reward_id)
  );

  RETURN economy_private.response(TRUE, 'OK', p_request_id,
    jsonb_build_object(
      'redemption_id', v_redemption.id,
      'reward_id', v_redemption.reward_id,
      'reward_name', v_redemption.reward_name,
      'fulfilled_by', v_redemption.fulfilled_by_user_id,
      'fulfilled_at', v_redemption.fulfilled_at
    ));
END
$function$;

REVOKE ALL ON FUNCTION public.redeem_reward_item(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_reward_item(TEXT, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.rotate_reward_redemption_proof(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotate_reward_redemption_proof(UUID, UUID)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fulfill_reward_redemption(TEXT, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fulfill_reward_redemption(TEXT, UUID)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fulfill_reward_redemption(TEXT, UUID) IS
  'Supabase-Auth staff fulfillment. Repeated fulfillment returns original actor and timestamp.';
