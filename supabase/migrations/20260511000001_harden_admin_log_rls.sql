-- Keep admin/audit notification logs server-only.
-- These tables contain operational details and should never be readable or writable
-- through anon/authenticated Supabase clients.

ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role only" ON public.audit_logs;
DROP POLICY IF EXISTS "service role only" ON public.notification_logs;

CREATE POLICY "service role only" ON public.audit_logs
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "service role only" ON public.notification_logs
  FOR ALL
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.audit_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.notification_logs FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_logs TO service_role;
