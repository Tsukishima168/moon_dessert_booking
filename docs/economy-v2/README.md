# Kiwimu Economy v2 Foundation

## Current status

This directory documents the additive Economy v2 database foundation. The six
`20260715000000`–`20260715000005` migrations are local-only until every release
gate below passes. They have not been pushed to the linked production project.

All five source-site controls default to disabled:

- `read_enabled = false`
- `shadow_write_enabled = false`
- `write_enabled = false`
- `redeem_enabled = false`
- `rollout_percentage = 0`
- empty allowlist

Applying the schema therefore does not itself award, spend, redeem, import, or
expose Economy v2 points.

## Migration ownership and sequence

Shop is the only executable publisher for the shared Supabase project.

1. `20260715000000_economy_v2_adoption_preflight.sql`
   validates the inspected live contract and adopts the prior Map RLS repair.
2. `20260715000001_economy_v2_core.sql`
   adds rollout controls, accounts, append-only ledger/events, policy tables,
   games, stock, staff, proofs, achievements, stamps, and additive catalog
   columns.
3. `20260715000002_economy_v2_runtime.sql`
   implements event ingestion, pending claims, ledger writes, full reversal,
   and exact partial reversal.
4. `20260715000003_economy_v2_gacha.sql`
   moves daily limits, UTC-day idempotency, weighted RNG, cost, and reward into
   one server transaction.
5. `20260715000004_economy_v2_redemption_staff.sql`
   implements atomic redemption, stock reservation, credential rotation, and
   authenticated staff fulfillment.
6. `20260715000005_economy_v2_achievements_reconciliation.sql`
   evaluates achievements, issues and claims store proofs, exposes the wallet
   read model, and adds service-only health views.

Map and Passport must not add these SQL files to their executable migration
paths.

## Public operations

Every operation returns `{ ok, code, request_id, data }`. Client request UUIDs
are trace identifiers only; server-derived keys control economic idempotency.

- `economy_submit_event(jsonb, uuid)`
- `economy_claim_pending(uuid, uuid)`
- `play_daily_gacha(uuid)`
- `spin_reward_wheel(uuid)`
- `redeem_reward_item(text, uuid)`
- `rotate_reward_redemption_proof(uuid, uuid)`
- `fulfill_reward_redemption(text, uuid)`
- `economy_get_wallet(text, integer, uuid)`
- `issue_store_visit_proof(uuid, text, uuid)`
- `claim_store_visit_proof(text, uuid)`
- `reverse_point_reference(text, text, text, uuid)` for a full reversal
- `reverse_point_reference(text, text, text, bigint, text, uuid)` for an exact
  partial reversal keyed by an external refund reference

Only `service_role` may call either reversal overload. Authenticated users may
submit the explicitly authenticated policies, read their gated wallet, play
enabled games, redeem enabled rewards, and use staff operations only when their
Supabase user is active in `staff_members`.

Pending activity claims are created only by trusted server routes. A claim may
start without a user, but its globally unique evidence hash and random claim UUID
cannot be reused. `economy_claim_pending` accepts only event policies carrying
`pending_claim_allowed=true`, replaces any payload actor with `auth.uid()`, and
atomically binds the first successful claim to that member. Other members cannot
inspect or replay the bound claim. MBTI completion is the only policy enabled for
this path in the initial release.

## Policy decisions encoded in v1

- The browser never supplies an award or deduction amount.
- Passport activation is lifetime-idempotent; check-in is once per UTC epoch
  day according to server policy.
- Shop rewards are accepted only for an order whose database row belongs to the
  actor and is `completed`. Points are `floor(final_price / 100)` with no
  minimum award.
- Partial Shop refunds reverse the difference calculated from the same original
  earn policy. Multiple partial reversals can reference one original award, but
  their sum cannot exceed it.
- A reversal that would make the account negative fails atomically and requires
  operational review; it never commits a partial correction.
- Gacha keys use a fixed UTC date and ignore caller timezone and request UUID.
- Gacha cost, selected prize, reward, play record, and event share one database
  transaction.
- Badges and stamps award zero points. `Universe Starter` requires Passport,
  MBTI, Gacha, and a staff-confirmed Map visit; it does not require a purchase.
- Redemption credentials contain a random secret returned once. Only token IDs,
  hashes, and the last four secret characters are stored.
- Legacy anonymous or localStorage balances are not imported. Identified legacy
  records remain reconciliation input, not automatic spendable balance.

## Local verification

Run:

```bash
npm run test:economy-v2
```

The script creates a disposable native PostgreSQL 17 cluster, models the live
contract, applies all six migrations, and verifies:

- default-off rollout configuration;
- 100 idempotent event replays;
- forged client amounts, privileged events, and backdated period attacks;
- anonymous pending-claim binding, replay, cross-user, expiry, and policy gates;
- lifetime activation and caller-timezone Gacha bypass resistance;
- append-only tables, RLS, grants, and safe security-definer search paths;
- server-derived Shop rewards and no minimum ten-point award;
- Gacha, proof, achievement, redemption, fulfillment, and reversal flows;
- exact and replay-safe partial refunds;
- 100 concurrent one-point deductions from a 50-point account;
- 20 concurrent requests for the final stock item;
- 20 concurrent attempts against a lifetime-once activation policy;
- zero account-to-ledger mismatch.

Native PostgreSQL does not include `plpgsql_check`, so the script explicitly
reports that Supabase `db lint` is deferred. This skip is not a passing lint
result and does not replace the staging gate.

## Required release gates

Do not merge or push these migrations to production until all items pass:

1. A real Supabase staging or preview project is available.
2. The six migrations apply there from a production-compatible baseline.
3. `supabase db lint --level error --fail-on error` passes there.
4. PostgREST calls validate anon, authenticated, service-role, and staff
   boundaries against real Supabase Auth/RLS behavior.
5. Fresh-context independent review signs off the final diff.
6. Linked project ref and local/remote history are rechecked immediately before
   dry-run.
7. Production `db push --dry-run` lists exactly these six files and no seed,
   roles, unknown migration, or destructive SQL.
8. Production push receives explicit execution authorization after the gates.

After an additive production push, write flags stay off. Shadow comparison must
run for at least seven days with zero mismatch during the final 72 hours before
any canary. Each 10% → 50% → 100% level still requires 24 hours and 20 valid
events. Legacy authority retirement still requires the separate 14-day
observation period.
