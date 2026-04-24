-- Shared moonisland DB hardening:
-- daily_order_stats contains shop revenue and must not be visible to anon/authenticated
-- clients from sibling apps that share the same Supabase project.

REVOKE SELECT ON TABLE public.daily_order_stats FROM anon;
REVOKE SELECT ON TABLE public.daily_order_stats FROM authenticated;
