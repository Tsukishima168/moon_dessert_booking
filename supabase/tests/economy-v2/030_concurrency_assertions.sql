\set ON_ERROR_STOP on

DO $concurrency_assertions$
DECLARE
  v_balance BIGINT;
  v_deductions INTEGER;
  v_redemptions INTEGER;
  v_reserved INTEGER;
  v_activations INTEGER;
BEGIN
  SELECT balance INTO v_balance
  FROM public.point_accounts
  WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  SELECT count(*) INTO v_deductions
  FROM public.point_ledger
  WHERE idempotency_key LIKE 'concurrent-deduct-%';

  IF v_balance <> 0 OR v_deductions <> 50 THEN
    RAISE EXCEPTION '100-way deduction failed: balance %, committed deductions %',
      v_balance, v_deductions;
  END IF;

  SELECT count(*) INTO v_redemptions
  FROM public.reward_redemptions
  WHERE reward_id = 'stock-race';
  SELECT quantity_reserved INTO v_reserved
  FROM public.reward_stock_buckets
  WHERE reward_id = 'stock-race' AND bucket_key = 'default';

  IF v_redemptions <> 1 OR v_reserved <> 1 THEN
    RAISE EXCEPTION '20-way last-stock race failed: redemptions %, reserved %',
      v_redemptions, v_reserved;
  END IF;

  SELECT count(*) INTO v_activations
  FROM public.economy_events
  WHERE actor_user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    AND policy_key = 'passport.activation';

  IF v_activations <> 1 THEN
    RAISE EXCEPTION '20-way lifetime activation race created % events', v_activations;
  END IF;

  IF EXISTS (SELECT 1 FROM public.v_economy_ledger_integrity WHERE mismatch <> 0) THEN
    RAISE EXCEPTION 'ledger mismatch after concurrency tests';
  END IF;
END
$concurrency_assertions$;

SELECT 'concurrency assertions passed' AS result;
