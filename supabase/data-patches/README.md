Data patches live here when they update records but do not define or evolve schema.

Use `supabase/migrations/` for schema changes and RPC/view definitions that must be replayed in order.
Use `supabase/data-patches/` for one-off content alignment scripts such as MBTI/menu remaps.
