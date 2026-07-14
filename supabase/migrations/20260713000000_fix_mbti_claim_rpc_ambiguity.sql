-- 修正 shared MBTI claim RPC 的欄位名稱歧義。
-- RETURNS TABLE 會建立同名 PL/pgSQL 變數；未限定的 mbti_type / variant
-- 會在 UPDATE ... RETURNING 時觸發 PostgreSQL 42702。

CREATE OR REPLACE FUNCTION public.consume_mbti_claim(p_code TEXT)
RETURNS TABLE(mbti_type TEXT, variant TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.mbti_claims AS claims
  SET used_at = NOW()
  WHERE claims.code = p_code
    AND claims.used_at IS NULL
  RETURNING claims.mbti_type, claims.variant;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_mbti_claim(TEXT) TO anon, authenticated;
