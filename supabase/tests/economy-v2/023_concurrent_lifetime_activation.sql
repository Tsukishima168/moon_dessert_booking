\set ON_ERROR_STOP on

SELECT set_config('request.jwt.claim.role', 'authenticated', false);
SELECT set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', false);
SELECT public.economy_submit_event(
  jsonb_build_object(
    'event_id', gen_random_uuid(),
    'event_type', 'passport.activated',
    'occurred_at', now(),
    'source_site', 'passport',
    'actor_user_id', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'reference_id', 'activation-race-' || :'idx',
    'evidence', '{}'::jsonb,
    'schema_version', 1
  ),
  gen_random_uuid()
) ->> 'code';
