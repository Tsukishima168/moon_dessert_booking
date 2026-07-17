\set ON_ERROR_STOP on
SELECT set_config('request.jwt.claim.role', 'authenticated', false);
SELECT set_config('request.jwt.claim.sub', :'user_id', false);
SELECT public.redeem_reward_item('stock-race', gen_random_uuid()) ->> 'code';
