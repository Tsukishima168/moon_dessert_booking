\set ON_ERROR_STOP on

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', false);
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

DO $authenticated_rpc$
DECLARE
  v_wallet JSONB;
  v_owned_achievements INTEGER;
  v_catalog_items INTEGER;
  v_owned_redemptions INTEGER;
BEGIN
  v_wallet := public.economy_get_wallet('passport', 20, gen_random_uuid());
  IF (v_wallet ->> 'code') <> 'OK' THEN
    RAISE EXCEPTION 'authenticated role could not use wallet RPC: %', v_wallet;
  END IF;

  SELECT count(*) INTO v_owned_achievements FROM public.user_achievements;
  IF v_owned_achievements < 1 THEN
    RAISE EXCEPTION 'authenticated role could not read own achievements';
  END IF;

  SELECT count(*) INTO v_catalog_items FROM public.reward_items;
  IF v_catalog_items < 1 THEN
    RAISE EXCEPTION 'authenticated role could not read the active reward catalog';
  END IF;

  SELECT count(*) INTO v_owned_redemptions
  FROM public.reward_redemptions
  WHERE user_id <> '11111111-1111-1111-1111-111111111111';
  IF v_owned_redemptions <> 0 THEN
    RAISE EXCEPTION 'authenticated reward redemption RLS leaked another member';
  END IF;

  BEGIN
    INSERT INTO public.reward_items (reward_id, name, points_cost, category)
    VALUES ('forged-role-reward', 'forged', 1, 'dessert');
    RAISE EXCEPTION 'authenticated directly inserted reward_items';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    UPDATE public.reward_redemptions SET status = 'cancelled';
    RAISE EXCEPTION 'authenticated directly updated reward_redemptions';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$authenticated_rpc$;

RESET ROLE;
SET ROLE anon;
DO $anon_catalog$
DECLARE
  v_rules INTEGER;
  v_catalog_items INTEGER;
BEGIN
  SELECT count(*) INTO v_rules FROM public.economy_achievement_rules;
  IF v_rules <> 5 THEN
    RAISE EXCEPTION 'anon active achievement catalog expected 5 rows, got %', v_rules;
  END IF;

  SELECT count(*) INTO v_catalog_items FROM public.reward_items;
  IF v_catalog_items < 1 THEN
    RAISE EXCEPTION 'anon could not read active reward catalog';
  END IF;

  BEGIN
    PERFORM 1 FROM public.reward_redemptions;
    RAISE EXCEPTION 'anon directly selected reward_redemptions';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$anon_catalog$;

RESET ROLE;
SET ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', false);
DO $service_reconciliation$
DECLARE
  v_rows INTEGER;
BEGIN
  SELECT count(*) INTO v_rows FROM public.v_economy_ledger_integrity;
  IF v_rows < 1 THEN
    RAISE EXCEPTION 'service role could not read reconciliation view';
  END IF;
END
$service_reconciliation$;

RESET ROLE;
SELECT 'role boundary assertions passed' AS result;
