-- Economy v2 core: server-authoritative ledger, event contract, rollout
-- controls, inventory, staff authorization, proofs, stamps, and achievements.
-- All rollout capabilities remain disabled after this migration.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS economy_private;
REVOKE ALL ON SCHEMA economy_private FROM PUBLIC, anon, authenticated;

CREATE TABLE public.economy_rollout_config (
  source_site TEXT PRIMARY KEY,
  read_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  shadow_write_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  write_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  redeem_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_percentage INTEGER NOT NULL DEFAULT 0
    CHECK (rollout_percentage BETWEEN 0 AND 100),
  allowlist UUID[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CHECK (source_site IN ('passport', 'kiwimu', 'gacha', 'shop', 'map'))
);

INSERT INTO public.economy_rollout_config (source_site)
VALUES ('passport'), ('kiwimu'), ('gacha'), ('shop'), ('map')
ON CONFLICT (source_site) DO NOTHING;

CREATE TABLE public.point_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
  lifetime_spent BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_spent >= 0),
  version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.point_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.point_accounts(user_id) ON DELETE RESTRICT,
  delta BIGINT NOT NULL CHECK (delta <> 0),
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  entry_type TEXT NOT NULL
    CHECK (entry_type IN ('earn', 'spend', 'reversal', 'grant', 'adjustment')),
  source_site TEXT NOT NULL CHECK (length(btrim(source_site)) > 0),
  reference_type TEXT NOT NULL CHECK (length(btrim(reference_type)) > 0),
  reference_id TEXT NOT NULL CHECK (length(btrim(reference_id)) > 0),
  policy_key TEXT,
  policy_version INTEGER,
  idempotency_key TEXT NOT NULL UNIQUE,
  reversal_of UUID REFERENCES public.point_ledger(id) ON DELETE RESTRICT,
  request_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (entry_type IN ('earn', 'grant') AND delta > 0)
    OR (entry_type = 'spend' AND delta < 0)
    OR entry_type IN ('reversal', 'adjustment')
  ),
  CHECK ((entry_type = 'reversal') = (reversal_of IS NOT NULL))
);

CREATE INDEX point_ledger_user_created_idx
  ON public.point_ledger (user_id, created_at DESC);
CREATE INDEX point_ledger_reference_idx
  ON public.point_ledger (source_site, reference_id, created_at DESC);
CREATE INDEX point_ledger_reversal_of_idx
  ON public.point_ledger (reversal_of)
  WHERE reversal_of IS NOT NULL;

CREATE TABLE public.economy_event_policies (
  policy_key TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  source_site TEXT NOT NULL,
  event_type TEXT NOT NULL,
  submission_mode TEXT NOT NULL DEFAULT 'service_role'
    CHECK (submission_mode IN ('authenticated', 'service_role', 'internal')),
  reward_points INTEGER NOT NULL DEFAULT 0 CHECK (reward_points >= 0),
  period_seconds INTEGER NOT NULL DEFAULT 0 CHECK (period_seconds >= 0),
  period_timezone TEXT NOT NULL DEFAULT 'UTC'
    CHECK (period_timezone IN ('UTC', 'Asia/Taipei')),
  max_per_period INTEGER NOT NULL DEFAULT 1 CHECK (max_per_period > 0),
  eligibility JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(eligibility) = 'object'),
  active_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  active_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (policy_key, version),
  CHECK (source_site IN ('passport', 'kiwimu', 'gacha', 'shop', 'map')),
  CHECK (length(btrim(event_type)) > 0),
  CHECK (active_until IS NULL OR active_until > active_from)
);

CREATE UNIQUE INDEX economy_event_policies_one_active_idx
  ON public.economy_event_policies (source_site, event_type)
  WHERE is_active;

INSERT INTO public.economy_event_policies
  (policy_key, version, source_site, event_type, submission_mode, reward_points,
   period_seconds, period_timezone, max_per_period, eligibility)
VALUES
  ('passport.activation', 1, 'passport', 'passport.activated', 'authenticated', 0, 0, 'UTC', 1,
    '{"limit_scope":"lifetime"}'::jsonb),
  ('passport.daily_checkin', 1, 'passport', 'passport.daily_checkin', 'authenticated', 1, 86400, 'Asia/Taipei', 1, '{}'),
  ('kiwimu.mbti_weekly', 1, 'kiwimu', 'mbti.completed', 'service_role', 0, 604800, 'UTC', 1,
    '{"pending_claim_allowed":true}'::jsonb),
  ('gacha.daily_play', 1, 'gacha', 'gacha.played', 'internal', 0, 86400, 'UTC', 1, '{}'),
  ('gacha.reward_wheel', 1, 'gacha', 'gacha.wheel_spun', 'internal', 0, 86400, 'UTC', 1, '{}'),
  ('shop.completed_order', 1, 'shop', 'order.completed', 'service_role', 0, 0, 'UTC', 1,
    '{"reward_formula":"shop_completed_order_floor_100"}'::jsonb),
  ('map.staff_visit', 1, 'map', 'map.visit_confirmed', 'internal', 0, 86400, 'UTC', 1, '{}')
ON CONFLICT (policy_key, version) DO NOTHING;

CREATE TABLE public.economy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE,
  event_type TEXT NOT NULL CHECK (length(btrim(event_type)) > 0),
  occurred_at TIMESTAMPTZ NOT NULL,
  source_site TEXT NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reference_id TEXT NOT NULL CHECK (length(btrim(reference_id)) > 0),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence) = 'object'),
  schema_version INTEGER NOT NULL CHECK (schema_version = 1),
  policy_key TEXT NOT NULL,
  policy_version INTEGER NOT NULL,
  policy_points INTEGER NOT NULL DEFAULT 0 CHECK (policy_points >= 0),
  awarded_points INTEGER NOT NULL DEFAULT 0 CHECK (awarded_points >= 0),
  period_key BIGINT,
  status TEXT NOT NULL CHECK (status IN ('shadow', 'accepted')),
  idempotency_key TEXT NOT NULL UNIQUE,
  request_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (policy_key, policy_version)
    REFERENCES public.economy_event_policies(policy_key, version) ON DELETE RESTRICT,
  CHECK (source_site IN ('passport', 'kiwimu', 'gacha', 'shop', 'map'))
);

CREATE INDEX economy_events_actor_created_idx
  ON public.economy_events (actor_user_id, created_at DESC);
CREATE INDEX economy_events_policy_period_idx
  ON public.economy_events (actor_user_id, policy_key, period_key, created_at DESC);
CREATE INDEX economy_events_reference_idx
  ON public.economy_events (source_site, reference_id);

CREATE TABLE public.pending_activity_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_site TEXT NOT NULL,
  event_payload JSONB NOT NULL CHECK (jsonb_typeof(event_payload) = 'object'),
  evidence_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  claimed_event_id UUID REFERENCES public.economy_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_site IN ('passport', 'kiwimu', 'gacha', 'shop', 'map')),
  CHECK (expires_at > created_at)
);

CREATE TABLE public.economy_shadow_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_site TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  legacy_delta BIGINT,
  economy_delta BIGINT,
  mismatch BOOLEAN NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  compared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_site, reference_id),
  CHECK (source_site IN ('passport', 'kiwimu', 'gacha', 'shop', 'map'))
);

CREATE TABLE public.economy_game_configs (
  game_mode TEXT PRIMARY KEY CHECK (game_mode IN ('daily_gacha', 'reward_wheel')),
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  cost_points INTEGER NOT NULL DEFAULT 0 CHECK (cost_points >= 0),
  daily_limit INTEGER NOT NULL DEFAULT 1 CHECK (daily_limit = 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.economy_game_configs (game_mode, is_enabled, cost_points)
VALUES
  ('daily_gacha', FALSE, 0),
  ('reward_wheel', FALSE, 30)
ON CONFLICT (game_mode) DO UPDATE
SET is_enabled = FALSE,
    cost_points = EXCLUDED.cost_points,
    updated_at = now();

CREATE TABLE public.economy_gacha_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_mode TEXT NOT NULL REFERENCES public.economy_game_configs(game_mode) ON DELETE CASCADE,
  prize_code TEXT NOT NULL,
  label TEXT NOT NULL,
  weight INTEGER NOT NULL CHECK (weight > 0),
  points_delta INTEGER NOT NULL DEFAULT 0 CHECK (points_delta >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_mode, prize_code)
);

CREATE TABLE public.economy_gacha_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  game_mode TEXT NOT NULL REFERENCES public.economy_game_configs(game_mode) ON DELETE RESTRICT,
  prize_id UUID NOT NULL REFERENCES public.economy_gacha_prizes(id) ON DELETE RESTRICT,
  cost_points INTEGER NOT NULL CHECK (cost_points >= 0),
  reward_points INTEGER NOT NULL CHECK (reward_points >= 0),
  outcome JSONB NOT NULL CHECK (jsonb_typeof(outcome) = 'object'),
  idempotency_key TEXT NOT NULL UNIQUE,
  request_id UUID NOT NULL,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX economy_gacha_plays_user_mode_idx
  ON public.economy_gacha_plays (user_id, game_mode, played_at DESC);

ALTER TABLE public.reward_items
  ADD COLUMN IF NOT EXISTS catalog_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS stock_mode TEXT NOT NULL DEFAULT 'unlimited',
  ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS redemption_period_seconds INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS max_per_period INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS economy_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $reward_item_constraints$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_items_catalog_version_check') THEN
    ALTER TABLE public.reward_items
      ADD CONSTRAINT reward_items_catalog_version_check CHECK (catalog_version > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_items_stock_mode_check') THEN
    ALTER TABLE public.reward_items
      ADD CONSTRAINT reward_items_stock_mode_check CHECK (stock_mode IN ('unlimited', 'finite'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_items_redemption_period_check') THEN
    ALTER TABLE public.reward_items
      ADD CONSTRAINT reward_items_redemption_period_check CHECK (redemption_period_seconds > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_items_max_per_period_check') THEN
    ALTER TABLE public.reward_items
      ADD CONSTRAINT reward_items_max_per_period_check CHECK (max_per_period > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_items_economy_metadata_object_check') THEN
    ALTER TABLE public.reward_items
      ADD CONSTRAINT reward_items_economy_metadata_object_check CHECK (jsonb_typeof(economy_metadata) = 'object');
  END IF;
END
$reward_item_constraints$;

CREATE TABLE public.reward_stock_buckets (
  reward_id TEXT NOT NULL REFERENCES public.reward_items(reward_id) ON DELETE RESTRICT,
  bucket_key TEXT NOT NULL DEFAULT 'default',
  quantity_total INTEGER NOT NULL CHECK (quantity_total >= 0),
  quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  quantity_fulfilled INTEGER NOT NULL DEFAULT 0 CHECK (quantity_fulfilled >= 0),
  quantity_released INTEGER NOT NULL DEFAULT 0 CHECK (quantity_released >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (reward_id, bucket_key),
  CHECK (quantity_reserved + quantity_fulfilled <= quantity_total)
);

ALTER TABLE public.reward_redemptions
  ADD COLUMN IF NOT EXISTS redeem_request_id UUID,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS catalog_version INTEGER,
  ADD COLUMN IF NOT EXISTS stock_bucket_key TEXT,
  ADD COLUMN IF NOT EXISTS redemption_code_hash TEXT,
  ADD COLUMN IF NOT EXISTS credential_last4 TEXT,
  ADD COLUMN IF NOT EXISTS fulfilled_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMPTZ;

-- Recover safely if an earlier staging/manual draft added `request_id` before
-- the immutable redeem request field was renamed. Production has not applied
-- this migration yet, but copying the value keeps partially adopted schemas
-- idempotent without dropping the legacy column.
DO $reward_redemption_request_upgrade$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reward_redemptions'
      AND column_name = 'request_id'
      AND data_type = 'uuid'
  ) THEN
    EXECUTE $sql$
      UPDATE public.reward_redemptions
      SET redeem_request_id = request_id
      WHERE redeem_request_id IS NULL
        AND request_id IS NOT NULL
    $sql$;
  END IF;
END
$reward_redemption_request_upgrade$;

CREATE UNIQUE INDEX IF NOT EXISTS reward_redemptions_idempotency_idx
  ON public.reward_redemptions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reward_redemptions_code_hash_idx
  ON public.reward_redemptions (redemption_code_hash)
  WHERE redemption_code_hash IS NOT NULL;
DROP INDEX IF EXISTS public.reward_redemptions_request_idx;
CREATE UNIQUE INDEX reward_redemptions_request_idx
  ON public.reward_redemptions (user_id, reward_id, redeem_request_id)
  WHERE redeem_request_id IS NOT NULL;

CREATE TABLE public.staff_members (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('staff', 'manager', 'admin')),
  location_ids TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.staff_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (length(btrim(action)) > 0),
  target_type TEXT NOT NULL CHECK (length(btrim(target_type)) > 0),
  target_id TEXT NOT NULL CHECK (length(btrim(target_id)) > 0),
  request_id UUID NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.store_visit_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL UNIQUE,
  subject_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  location_id TEXT NOT NULL CHECK (length(btrim(location_id)) > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

-- Short-lived response cache for proof-bearing operations. It is never exposed
-- directly to clients and lets a retried request return the same credential
-- instead of rotating or minting a second proof.
CREATE TABLE public.economy_operation_replays (
  scope_key TEXT NOT NULL CHECK (length(btrim(scope_key)) > 0),
  operation_key TEXT NOT NULL CHECK (length(btrim(operation_key)) > 0),
  request_id UUID NOT NULL,
  request_fingerprint TEXT NOT NULL CHECK (length(request_fingerprint) = 64),
  response_data JSONB NOT NULL CHECK (
    jsonb_typeof(response_data) = 'object'
    AND octet_length(response_data::text) <= 16384
  ),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_key, operation_key, request_id),
  CHECK (expires_at > created_at)
);

CREATE INDEX economy_operation_replays_expiry_idx
  ON public.economy_operation_replays (expires_at);

CREATE TABLE public.economy_mbti_attempts (
  attempt_id UUID PRIMARY KEY,
  quiz_version TEXT NOT NULL CHECK (quiz_version IN ('v1-40', 'v2-tw-40')),
  subject_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  proof_hash TEXT NOT NULL UNIQUE CHECK (length(proof_hash) = 64),
  not_before TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  issue_request_id UUID NOT NULL,
  consumed_at TIMESTAMPTZ,
  completion_id UUID UNIQUE,
  completion_response JSONB CHECK (
    completion_response IS NULL OR jsonb_typeof(completion_response) = 'object'
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > not_before),
  CHECK ((consumed_at IS NULL) = (completion_id IS NULL)),
  CHECK ((completion_id IS NULL) = (completion_response IS NULL))
);

CREATE INDEX economy_mbti_attempts_expiry_idx
  ON public.economy_mbti_attempts (expires_at)
  WHERE consumed_at IS NULL;

CREATE TABLE public.economy_achievement_rules (
  achievement_key TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  achievement_type TEXT NOT NULL CHECK (achievement_type IN ('badge', 'stamp')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  event_type TEXT,
  required_event_types TEXT[] NOT NULL DEFAULT '{}',
  points_reward INTEGER NOT NULL DEFAULT 0 CHECK (points_reward = 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (achievement_key, version)
);

INSERT INTO public.economy_achievement_rules
  (achievement_key, version, achievement_type, name, description, event_type, required_event_types)
VALUES
  ('mbti_first_complete', 1, 'badge', 'MBTI 初次完成', '首次完成 Kiwimu MBTI 測驗。', 'mbti.completed', '{}'),
  ('gacha_first_play', 1, 'badge', 'Gacha 初次遊戲', '首次完成有效 Gacha 遊戲。', 'gacha.played', '{}'),
  ('map_staff_visit', 1, 'stamp', 'Map 到店印章', '由登入店員確認的到店紀錄。', 'map.visit_confirmed', '{}'),
  ('shop_first_completed_order', 1, 'badge', 'Shop 初次完成訂單', '首次完成並確認的 Shop 訂單。', 'order.completed', '{}'),
  ('universe_starter', 1, 'badge', 'Universe Starter', '啟用 Passport 並完成 MBTI、Gacha 與 Map 到店。', NULL,
    ARRAY['passport.activated', 'mbti.completed', 'gacha.played', 'map.visit_confirmed'])
ON CONFLICT (achievement_key, version) DO NOTHING;

CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  achievement_version INTEGER NOT NULL,
  source_event_id UUID REFERENCES public.economy_events(id) ON DELETE RESTRICT,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_key, achievement_version),
  FOREIGN KEY (achievement_key, achievement_version)
    REFERENCES public.economy_achievement_rules(achievement_key, version) ON DELETE RESTRICT
);

CREATE TABLE public.user_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stamp_key TEXT NOT NULL,
  stamp_version INTEGER NOT NULL,
  location_id TEXT NOT NULL,
  proof_id UUID NOT NULL UNIQUE REFERENCES public.store_visit_proofs(id) ON DELETE RESTRICT,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, stamp_key, stamp_version),
  FOREIGN KEY (stamp_key, stamp_version)
    REFERENCES public.economy_achievement_rules(achievement_key, version) ON DELETE RESTRICT
);

CREATE OR REPLACE FUNCTION economy_private.reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  RAISE EXCEPTION 'append-only relation % cannot be %', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '55000';
END
$function$;

CREATE TRIGGER point_ledger_append_only
  BEFORE UPDATE OR DELETE ON public.point_ledger
  FOR EACH ROW EXECUTE FUNCTION economy_private.reject_mutation();
CREATE TRIGGER economy_events_append_only
  BEFORE UPDATE OR DELETE ON public.economy_events
  FOR EACH ROW EXECUTE FUNCTION economy_private.reject_mutation();
CREATE TRIGGER staff_audit_log_append_only
  BEFORE UPDATE OR DELETE ON public.staff_audit_log
  FOR EACH ROW EXECUTE FUNCTION economy_private.reject_mutation();
CREATE TRIGGER user_achievements_append_only
  BEFORE UPDATE OR DELETE ON public.user_achievements
  FOR EACH ROW EXECUTE FUNCTION economy_private.reject_mutation();
CREATE TRIGGER user_stamps_append_only
  BEFORE UPDATE OR DELETE ON public.user_stamps
  FOR EACH ROW EXECUTE FUNCTION economy_private.reject_mutation();

ALTER TABLE public.economy_rollout_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_event_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_activity_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_shadow_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_game_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_gacha_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_gacha_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_stock_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_visit_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_operation_replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_mbti_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_achievement_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mbti_claims ENABLE ROW LEVEL SECURITY;

-- Existing claim/reward tables predate Economy v2. Replace every legacy policy
-- so an earlier permissive policy cannot survive adoption.
DO $legacy_authority_rls_policies$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('reward_items', 'reward_redemptions', 'mbti_claims')
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );
  END LOOP;
END
$legacy_authority_rls_policies$;

CREATE POLICY point_accounts_select_own ON public.point_accounts
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY point_ledger_select_own ON public.point_ledger
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY economy_events_select_own ON public.economy_events
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = actor_user_id);
CREATE POLICY pending_activity_claims_select_own ON public.pending_activity_claims
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY economy_gacha_plays_select_own ON public.economy_gacha_plays
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY staff_members_select_self ON public.staff_members
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id AND is_active);
CREATE POLICY achievement_rules_select_active ON public.economy_achievement_rules
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY user_achievements_select_own ON public.user_achievements
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY user_stamps_select_own ON public.user_stamps
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY reward_items_select_active ON public.reward_items
  FOR SELECT TO anon, authenticated
  USING (
    is_active
    AND (available_from IS NULL OR available_from <= now())
    AND (available_until IS NULL OR available_until > now())
  );
CREATE POLICY reward_redemptions_select_own ON public.reward_redemptions
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE
  public.economy_rollout_config,
  public.point_accounts,
  public.point_ledger,
  public.economy_event_policies,
  public.economy_events,
  public.pending_activity_claims,
  public.economy_shadow_comparisons,
  public.economy_game_configs,
  public.economy_gacha_prizes,
  public.economy_gacha_plays,
  public.reward_stock_buckets,
  public.staff_members,
  public.staff_audit_log,
  public.store_visit_proofs,
  public.economy_operation_replays,
  public.economy_mbti_attempts,
  public.economy_achievement_rules,
  public.user_achievements,
  public.user_stamps,
  public.reward_items,
  public.reward_redemptions,
  public.mbti_claims
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.economy_achievement_rules, public.user_achievements,
  public.user_stamps TO authenticated;
GRANT SELECT ON public.economy_achievement_rules TO anon;
GRANT SELECT ON public.reward_items TO anon, authenticated;
GRANT SELECT ON public.reward_redemptions TO authenticated;

GRANT ALL ON TABLE
  public.economy_rollout_config,
  public.point_accounts,
  public.point_ledger,
  public.economy_event_policies,
  public.economy_events,
  public.pending_activity_claims,
  public.economy_shadow_comparisons,
  public.economy_game_configs,
  public.economy_gacha_prizes,
  public.economy_gacha_plays,
  public.reward_stock_buckets,
  public.staff_members,
  public.staff_audit_log,
  public.store_visit_proofs,
  public.economy_operation_replays,
  public.economy_mbti_attempts,
  public.economy_achievement_rules,
  public.user_achievements,
  public.user_stamps,
  public.reward_items,
  public.reward_redemptions,
  public.mbti_claims
TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.staff_audit_log_id_seq TO service_role;

COMMENT ON TABLE public.point_ledger IS
  'Economy v2 append-only source of truth. Direct UPDATE and DELETE are rejected.';
COMMENT ON TABLE public.economy_rollout_config IS
  'Server-owned per-source rollout flags. All capabilities default off.';
COMMENT ON TABLE public.economy_event_policies IS
  'Versioned server-side point policy. Client payloads never choose reward_points.';
COMMENT ON TABLE public.economy_operation_replays IS
  'Service-only short-lived cache for idempotent proof-bearing responses.';

DO $legacy_authority_security_postcondition$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('reward_items', 'reward_redemptions', 'mbti_claims')
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Economy v2 legacy authority tables must have RLS enabled';
  END IF;

  IF has_table_privilege('anon', 'public.reward_items', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
     OR has_table_privilege('authenticated', 'public.reward_items', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
     OR has_table_privilege('anon', 'public.reward_redemptions', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
     OR has_table_privilege('authenticated', 'public.reward_redemptions', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
     OR has_table_privilege('anon', 'public.mbti_claims', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
     OR has_table_privilege('authenticated', 'public.mbti_claims', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
    RAISE EXCEPTION 'Economy v2 legacy authority grants are broader than the canonical boundary';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (tablename IN ('reward_items', 'reward_redemptions')
          AND policyname NOT IN ('reward_items_select_active', 'reward_redemptions_select_own'))
        OR tablename = 'mbti_claims'
      )
  ) THEN
    RAISE EXCEPTION 'Economy v2 legacy authority tables retain an unexpected RLS policy';
  END IF;
END
$legacy_authority_security_postcondition$;

-- Keep the legacy claim bridge available during the staged rollout, but remove
-- the implicit PUBLIC grant and the mutable public-schema search path. It will
-- be retired only after every client has moved to Economy v2 proofs.
CREATE OR REPLACE FUNCTION public.consume_mbti_claim(p_code TEXT)
RETURNS TABLE(mbti_type TEXT, variant TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  IF p_code IS NULL OR length(btrim(p_code)) = 0 OR octet_length(p_code) > 256 THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.mbti_claims AS claims
  SET used_at = now()
  WHERE claims.code = btrim(p_code)
    AND claims.used_at IS NULL
  RETURNING claims.mbti_type, claims.variant;
END
$function$;

REVOKE ALL ON FUNCTION public.consume_mbti_claim(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_mbti_claim(TEXT) TO anon, authenticated;
