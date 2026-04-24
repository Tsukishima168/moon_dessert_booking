DROP POLICY IF EXISTS "profiles: 用戶新增自己" ON public.profiles;

CREATE POLICY "profiles: 用戶新增自己"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
