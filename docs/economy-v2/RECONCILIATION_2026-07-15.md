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
- A linked production dry-run on 2026-07-16 succeeded and listed exactly those
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

## Staging blocker

Creation of the requested persistent preview branch `economy-v2-staging` was
attempted with no data copy. Supabase returned HTTP 402 because Branching is not
available on the current plan. No preview branch was created and no plan change
was made.

A disposable native PostgreSQL 17 cluster now provides deterministic migration,
role, idempotency, and concurrency tests. It is deliberately not treated as a
replacement for Supabase staging because it does not prove hosted extensions,
PostgREST, Auth JWT behavior, or production-equivalent `plpgsql_check` lint.

## Go/no-go

Current decision: **NO-GO for production migration, merge, or rollout enablement**.

Remaining mandatory evidence:

- real Supabase staging apply and lint;
- hosted Auth/RLS/PostgREST integration tests;
- fresh-context independent review;
- repeat the exact production dry-run immediately before an authorized push;
- seven-day shadow evidence and the later canary/observation windows.

The branch is suitable for a Draft PR so CI and external review can begin. A
Draft PR is not approval to merge or deploy.
