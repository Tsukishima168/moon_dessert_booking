-- Server-authoritative Gacha and reward-wheel outcomes.

-- Canonical prize catalog. Game configs and rollout flags remain disabled, so
-- these rows are inert until an explicit staged rollout is approved.
INSERT INTO public.economy_gacha_prizes
  (game_mode, prize_code, label, weight, points_delta, metadata, is_active)
VALUES
  ('daily_gacha', 'bronze', '銅色幸運', 45, 5, '{"tier":"bronze","fortune_id":1}'::jsonb, TRUE),
  ('daily_gacha', 'silver', '銀色幸運', 30, 10, '{"tier":"silver","fortune_id":2}'::jsonb, TRUE),
  ('daily_gacha', 'gold', '金色幸運', 15, 25, '{"tier":"gold","fortune_id":3}'::jsonb, TRUE),
  ('daily_gacha', 'rainbow', '彩虹幸運', 5, 50, '{"tier":"rainbow","fortune_id":4}'::jsonb, TRUE),
  ('daily_gacha', 'lucky', '月月大吉', 3, 100, '{"tier":"lucky","fortune_id":9}'::jsonb, TRUE),
  ('daily_gacha', 'jackpot', '月月頭獎', 2, 200, '{"tier":"jackpot","fortune_id":10}'::jsonb, TRUE),
  ('reward_wheel', 'points_5', '5 點', 300, 5, '{"tier":"common"}'::jsonb, TRUE),
  ('reward_wheel', 'points_10', '10 點', 220, 10, '{"tier":"common"}'::jsonb, TRUE),
  ('reward_wheel', 'points_20', '20 點', 100, 20, '{"tier":"uncommon"}'::jsonb, TRUE),
  ('reward_wheel', 'points_25', '25 點', 150, 25, '{"tier":"uncommon"}'::jsonb, TRUE),
  ('reward_wheel', 'points_50', '50 點', 60, 50, '{"tier":"rare"}'::jsonb, TRUE),
  ('reward_wheel', 'points_100', '100 點', 25, 100, '{"tier":"legendary"}'::jsonb, TRUE)
ON CONFLICT (game_mode, prize_code) DO UPDATE
SET label = EXCLUDED.label,
    weight = EXCLUDED.weight,
    points_delta = EXCLUDED.points_delta,
    metadata = EXCLUDED.metadata,
    is_active = EXCLUDED.is_active;

CREATE OR REPLACE FUNCTION economy_private.play_game(
  p_game_mode TEXT,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_config public.economy_game_configs%ROWTYPE;
  v_prize public.economy_gacha_prizes%ROWTYPE;
  v_existing public.economy_gacha_plays%ROWTYPE;
  v_play public.economy_gacha_plays%ROWTYPE;
  v_balance BIGINT;
  v_idempotency_key TEXT;
  v_event_type TEXT;
  v_event_result JSONB;
  v_utc_day DATE := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  p_request_id := coalesce(p_request_id, gen_random_uuid());

  IF v_user_id IS NULL THEN
    RETURN economy_private.response(FALSE, 'AUTH_REQUIRED', p_request_id);
  END IF;

  IF p_game_mode NOT IN ('daily_gacha', 'reward_wheel') THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id);
  END IF;

  IF NOT economy_private.rollout_enabled('gacha', 'write', v_user_id) THEN
    RETURN economy_private.response(FALSE, 'ROLLOUT_DISABLED', p_request_id);
  END IF;

  SELECT * INTO v_config
  FROM public.economy_game_configs
  WHERE game_mode = p_game_mode
    AND is_enabled;

  IF NOT FOUND THEN
    RETURN economy_private.response(FALSE, 'ROLLOUT_DISABLED', p_request_id);
  END IF;

  -- A game mode is intentionally one authoritative outcome per UTC day. The
  -- request UUID and the caller-controlled session timezone never participate
  -- in this key.
  v_idempotency_key := encode(extensions.digest(
    v_user_id::text || '|' || p_game_mode || '|' || v_utc_day::text,
    'sha256'
  ), 'hex');

  PERFORM pg_advisory_xact_lock(hashtextextended(
    v_user_id::text || '|' || p_game_mode || '|' || v_utc_day::text,
    0
  ));

  SELECT * INTO v_existing
  FROM public.economy_gacha_plays
  WHERE idempotency_key = v_idempotency_key;

  IF FOUND THEN
    SELECT balance INTO v_balance
    FROM public.point_accounts
    WHERE user_id = v_user_id;

    RETURN economy_private.response(FALSE, 'ALREADY_PROCESSED', p_request_id,
      jsonb_build_object(
        'play_id', v_existing.id,
        'outcome', v_existing.outcome,
        'cost_points', v_existing.cost_points,
        'reward_points', v_existing.reward_points,
        'balance', coalesce(v_balance, 0),
        'event', coalesce((
          SELECT jsonb_build_object(
            'event_id', e.id,
            'status', e.status,
            'awarded_points', e.awarded_points,
            'balance', coalesce(v_balance, 0)
          )
          FROM public.economy_events e
          WHERE e.actor_user_id = v_user_id
            AND e.source_site = 'gacha'
            AND e.reference_id = v_existing.id::text
          ORDER BY e.created_at
          LIMIT 1
        ), '{}'::jsonb)
      ));
  END IF;

  INSERT INTO public.point_accounts (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_balance
  FROM public.point_accounts
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_balance < v_config.cost_points THEN
    RETURN economy_private.response(FALSE, 'INSUFFICIENT_POINTS', p_request_id,
      jsonb_build_object('balance', v_balance, 'cost_points', v_config.cost_points));
  END IF;

  -- Exponential-race weighted sampling; both weight and point outcome are
  -- server-owned rows. The client receives only the committed result.
  SELECT p.* INTO v_prize
  FROM public.economy_gacha_prizes p
  WHERE p.game_mode = p_game_mode
    AND p.is_active
  ORDER BY (-ln(greatest(random(), 0.000000000001)) / p.weight)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN economy_private.response(FALSE, 'NOT_ELIGIBLE', p_request_id,
      jsonb_build_object('reason', 'no_active_prize'));
  END IF;

  INSERT INTO public.economy_gacha_plays (
    user_id,
    game_mode,
    prize_id,
    cost_points,
    reward_points,
    outcome,
    idempotency_key,
    request_id
  ) VALUES (
    v_user_id,
    p_game_mode,
    v_prize.id,
    v_config.cost_points,
    v_prize.points_delta,
    jsonb_build_object(
      'prize_code', v_prize.prize_code,
      'label', v_prize.label,
      'metadata', v_prize.metadata
    ),
    v_idempotency_key,
    p_request_id
  )
  RETURNING * INTO v_play;

  IF v_config.cost_points > 0 THEN
    PERFORM economy_private.apply_ledger_entry(
      v_user_id,
      -v_config.cost_points,
      'spend',
      'gacha',
      p_game_mode || '.cost',
      v_play.id::text,
      NULL,
      NULL,
      'game-cost:' || v_idempotency_key,
      p_request_id,
      jsonb_build_object('play_id', v_play.id)
    );
  END IF;

  IF v_prize.points_delta > 0 THEN
    PERFORM economy_private.apply_ledger_entry(
      v_user_id,
      v_prize.points_delta,
      'earn',
      'gacha',
      p_game_mode || '.reward',
      v_play.id::text,
      NULL,
      NULL,
      'game-reward:' || v_idempotency_key,
      p_request_id,
      jsonb_build_object('play_id', v_play.id, 'prize_code', v_prize.prize_code)
    );
  END IF;

  v_event_type := CASE p_game_mode
    WHEN 'daily_gacha' THEN 'gacha.played'
    ELSE 'gacha.wheel_spun'
  END;

  v_event_result := economy_private.submit_event(
    jsonb_build_object(
      'event_id', gen_random_uuid(),
      'event_type', v_event_type,
      'occurred_at', now(),
      'source_site', 'gacha',
      'actor_user_id', v_user_id,
      'reference_id', v_play.id::text,
      'evidence', jsonb_build_object('game_mode', p_game_mode, 'prize_code', v_prize.prize_code),
      'schema_version', 1
    ),
    p_request_id,
    TRUE
  );

  SELECT balance INTO v_balance
  FROM public.point_accounts
  WHERE user_id = v_user_id;

  RETURN economy_private.response(TRUE, 'OK', p_request_id,
    jsonb_build_object(
      'play_id', v_play.id,
      'outcome', v_play.outcome,
      'cost_points', v_play.cost_points,
      'reward_points', v_play.reward_points,
      'balance', v_balance,
      'event', v_event_result -> 'data'
    ));
END
$function$;

CREATE OR REPLACE FUNCTION public.play_daily_gacha(
  p_request_id UUID DEFAULT gen_random_uuid()
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT economy_private.play_game('daily_gacha', coalesce(p_request_id, gen_random_uuid()));
$function$;

CREATE OR REPLACE FUNCTION public.spin_reward_wheel(
  p_request_id UUID DEFAULT gen_random_uuid()
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT economy_private.play_game('reward_wheel', coalesce(p_request_id, gen_random_uuid()));
$function$;

REVOKE ALL ON FUNCTION public.play_daily_gacha(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.play_daily_gacha(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.spin_reward_wheel(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spin_reward_wheel(UUID) TO authenticated, service_role;
