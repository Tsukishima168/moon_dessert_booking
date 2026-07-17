\set ON_ERROR_STOP on
SELECT economy_private.apply_ledger_entry(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  -1,
  'spend',
  'system',
  'concurrency_test',
  'ledger-race',
  NULL,
  NULL,
  'concurrent-deduct-' || :'idx',
  gen_random_uuid(),
  '{}'::jsonb
);
