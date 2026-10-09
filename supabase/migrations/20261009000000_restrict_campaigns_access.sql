-- Source only: apply through an approved database migration, never a production probe.
-- campaigns are administrative send instructions, not a public content API.
BEGIN;
REVOKE ALL PRIVILEGES ON TABLE public.campaigns FROM PUBLIC, anon, authenticated;
-- Table-level REVOKE does not clear pre-existing column-level privileges.
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT attname FROM pg_attribute
    WHERE attrelid = 'public.campaigns'::regclass AND attnum > 0 AND NOT attisdropped
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES (%I) ON TABLE public.campaigns FROM PUBLIC, anon, authenticated', item.attname);
  END LOOP;
  FOR item IN SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'campaigns'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.campaigns', item.policyname);
  END LOOP;
END $$;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.campaigns TO service_role;
COMMIT;
