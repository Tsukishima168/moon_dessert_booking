# Supabase reconciliation — 2026-07-15/16

## Verified target and history

- Canonical publisher: Shop repository.
- Linked project ref: `xlqwfaailjyvsycjnzkz`.
- Region/status at the 2026-07-16 recheck: `ap-southeast-1`,
  `ACTIVE_HEALTHY`.
- Supabase CLI used for reconciliation: `2.105.0`.
- Existing history before Economy v2: 35 local versions and the same 35 remote
  versions.
- Current candidate-only versions: `20260715000000` through
  `20260715000005`; all six have an empty remote column and have not been
  pushed.
- A final linked production dry-run on 2026-07-16 succeeded and listed exactly those
  six migrations, with no roles, seed, or unknown version. It performed no
  push and must be repeated immediately before any authorized production push.

No `migration repair` was used. No production SQL mutation was executed during
this reconciliation.

## Live contract checked read-only

The live catalog contains the required legacy relations and the Shop order
fields used by the server policy:

- `orders.order_id text`
- `orders.user_id uuid`
- `orders.status text`
- `orders.final_price numeric`
- `orders.total_price integer`
- `profiles.points integer`
- `point_transactions.points integer`
- `reward_items.reward_id text`
- the existing `reward_redemptions` contract modeled by the native fixture

Supabase installs `digest` and `gen_random_bytes` in the `extensions` schema.
The candidate migrations and test fixture use that exact location; relying on
native PostgreSQL's default `public` location would fail in production.

The read-only drift inventory also found live reward, badge, check-in, event,
and claim tables that are not reconstructible solely from Shop's historic SQL.
The candidate therefore adopts rather than drops legacy structures and adds no
automatic balance import.

Legacy authority risks observed during reconciliation include RPCs that accept
client-controlled amounts or user identifiers and password-based staff flows.
They are not dropped in this additive migration because the five clients still
depend on legacy paths. Rollout flags and sequential client adapters must land
before those grants/functions can be retired safely.

## Data-boundary snapshot

Only aggregate counts were inspected; no member rows, emails, tokens, or order
contents were copied into the repository.

- Profiles: 141.
- Legacy point transactions: 1,358 total; 55 identified.
- Existing profile point sums at inspection: zero.
- Reward catalog: 10 items.
- Existing inventory: 5 rows, aggregate stock 20.
- Existing redemptions: zero.
- Existing activity claims: 31.
- Existing check-ins: 68.
- Existing user events: 5,573.
- Existing badges: 3.

These counts are reconciliation evidence, not an approved import. Anonymous and
localStorage balances remain excluded. Identified records require a separate,
reviewed reconstruction and the approved one-time upgrade-gift policy.

## Hosted staging resolution

The paid Supabase preview-branch route remained unavailable (HTTP 402), so a
separate hosted Supabase staging project was reset from a production-compatible
schema baseline. The six migrations passed hosted `plpgsql_check` lint,
Auth/RLS/PostgREST, default-off, proof replay, staff fulfillment, stock expiry,
100 deduction requests, 20 stock requests and 20 lifetime-activation requests.
The free tier refused 43 excess direct connections at transport level; native
PostgreSQL delivered all 100 deduction requests and the hosted invariant checks
still passed. Staging was reset after testing and verified at zero test users,
ledger rows, redemptions, enabled rollout rows and mismatch rows.

## Go/no-go

Current decision: **technical GO for an explicitly authorized additive
production migration; NO-GO for rollout enablement or legacy retirement**.

Remaining mandatory controls:

- explicit production migration/merge/deploy execution authorization;
- repeat history/dry-run if any local or remote migration changes;
- final PR checks and an independent/human signoff if required (the current
  runtime cannot spawn a delegated reviewer);
- formal reward stock buckets and staff allowlist before redeem canary;
- seven-day shadow evidence and the later canary/observation windows.

The branch is suitable for a Draft PR so CI and external review can begin. A
Draft PR is not approval to merge or deploy.
