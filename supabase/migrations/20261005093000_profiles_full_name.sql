-- Shop 會員 API 明確讀寫 full_name，但共用正式 profiles 尚無此欄位，導致登入後 GET/PATCH 500。
-- 只新增可選欄位；不回填個資，不改 RLS 或身分/點數守衛。沿用 owner-only policies。
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.profiles add column if not exists full_name text;
commit;
