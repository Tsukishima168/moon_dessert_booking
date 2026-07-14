-- Supabase 可能透過 default privileges 直接授權 anon / authenticated 執行新函式。
-- 原子訂單 RPC 使用 SECURITY DEFINER，必須只允許後端 service_role 呼叫。

REVOKE ALL ON FUNCTION public.insert_order_with_capacity_check(JSONB)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.insert_order_with_capacity_check(JSONB)
  TO service_role;
