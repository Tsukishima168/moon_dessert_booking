\set ON_ERROR_STOP on

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', false);
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

DO $authenticated_rpc$
DECLARE
  v_wallet JSONB;
  v_owned_achievements INTEGER;
BEGIN
  v_wallet := public.economy_get_wallet('passport', 20, gen_random_uuid());
  IF (v_wallet ->> 'code') <> 'OK' THEN
    RAISE EXCEPTION 'authenticated role could not use wallet RPC: %', v_wallet;
  END IF;

  SELECT count(*) INTO v_owned_achievements FROM public.user_achievements;
  IF v_owned_achievements < 1 THEN
    RAISE EXCEPTION 'authenticated role could not read own achievements';
  END IF;
END
$authenticated_rpc$;

RESET ROLE;
SET ROLE anon;
DO $anon_catalog$
DECLARE
  v_rules INTEGER;
BEGIN
  SELECT count(*) INTO v_rules FROM public.economy_achievement_rules;
  IF v_rules <> 5 THEN
    RAISE EXCEPTION 'anon active achievement catalog expected 5 rows, got %', v_rules;
  END IF;
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
